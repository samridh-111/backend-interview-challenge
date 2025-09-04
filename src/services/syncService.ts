import axios from 'axios';
import {
  Task,
  SyncQueueItem,
  SyncResult,
  BatchSyncRequest,
  BatchSyncResponse,
} from '../types';
import { Database } from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export class SyncService {
  private apiUrl: string;

  constructor(
    private db: Database,
    apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
  ) {
    this.apiUrl = apiUrl;
  }

  async sync(): Promise<SyncResult> {
    const queueItems = await this.db.all<SyncQueueItem>(
      'SELECT * FROM sync_queue ORDER BY created_at ASC'
    );

    if (queueItems.length === 0) {
      return { success: true, synced_items: 0, failed_items: 0, errors: [] };
    }

    const batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '50', 10);
    let synced = 0;
    let failed = 0;
    const errors: any[] = [];

    for (let i = 0; i < queueItems.length; i += batchSize) {
      const batch = queueItems.slice(i, i + batchSize);
      try {
        const response = await this.processBatch(batch);
        for (const item of response.processed_items) {
          if (item.status === 'success') {
            synced++;
            await this.updateSyncStatus(item.client_id, 'synced', {
              server_id: item.server_id,
            });
          } else {
            failed++;
            errors.push({
              task_id: item.client_id,
              operation: 'sync',
              error: item.error || 'Unknown error',
              timestamp: new Date()
            });
            await this.updateSyncStatus(item.client_id, 'error');
          }
        }
      } catch (err) {
        failed += batch.length;
        for (const item of batch) {
          errors.push({
            task_id: item.task_id,
            operation: item.operation,
            error: (err as Error).message,
            timestamp: new Date()
          });
          await this.handleSyncError(item, err as Error);
        }
      }
    }

    return {
      success: failed === 0,
      synced_items: synced,
      failed_items: failed,
      errors
    };
  }

  async addToSyncQueue(
    taskId: string,
    operation: 'create' | 'update' | 'delete',
    data: Partial<Task>
  ): Promise<void> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [id, taskId, operation, JSON.stringify(data), now]
    );
  }

  private async processBatch(items: SyncQueueItem[]): Promise<BatchSyncResponse> {
    const req: BatchSyncRequest = {
      items: items.map((item) => ({
        id: item.id,
        task_id: item.task_id,
        operation: item.operation,
        data: JSON.parse(item.data as string),
        created_at: item.created_at,
        retry_count: item.retry_count
      })),
      client_timestamp: new Date()
    };

    const { data } = await axios.post<BatchSyncResponse>(
      `${this.apiUrl}/batch`,
      req
    );

    return data;
  }


  private async updateSyncStatus(
    taskId: string,
    status: 'synced' | 'error',
    serverData?: Partial<Task>
  ): Promise<void> {
    const now = new Date().toISOString();

    const params: any[] = [status, now, taskId];
    let sql = `UPDATE tasks SET sync_status = ?, last_synced_at = ?`;

    if (serverData?.server_id) {
      sql += `, server_id = ?`;
      params.splice(2, 0, serverData.server_id);
    }

    sql += ` WHERE id = ?`;

    await this.db.run(sql, params);

    if (status === 'synced') {
      await this.db.run('DELETE FROM sync_queue WHERE task_id = ?', [taskId]);
    }
  }

  private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
    const retryCount = item.retry_count + 1;
    const maxRetries = parseInt(process.env.SYNC_MAX_RETRIES || '3', 10);

    if (retryCount >= maxRetries) {
      await this.db.run(
        `UPDATE sync_queue
         SET retry_count = ?, error_message = ?
         WHERE id = ?`,
        [retryCount, error.message, item.id]
      );
      await this.updateSyncStatus(item.task_id, 'error');
    } else {
      await this.db.run(
        `UPDATE sync_queue
         SET retry_count = ?, error_message = ?
         WHERE id = ?`,
        [retryCount, error.message, item.id]
      );
    }
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
