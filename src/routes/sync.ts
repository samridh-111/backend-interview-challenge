import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db);

  // Trigger manual sync
  router.post('/sync', async (req: Request, res: Response) => {
    try {
      // Check connectivity first
      const isOnline = await syncService.checkConnectivity();
      
      if (!isOnline) {
        return res.status(503).json({
          error: 'Service unavailable - offline',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      // Perform sync
      const result = await syncService.sync();
      
      return res.json({
        success: result.success,
        synced_items: result.synced_items,
        failed_items: result.failed_items,
        errors: result.errors || []
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to sync',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  });

  // Check sync status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      // Get pending sync count
      const pendingTasks = await taskService.getTasksNeedingSync();
      const pendingSyncCount = pendingTasks.length;

      // Get sync queue size
      const queueItems = await db.all('SELECT COUNT(*) as count FROM sync_queue');
      const syncQueueSize = queueItems[0]?.count || 0;

      // Get last sync timestamp
      const lastSyncResult = await db.get(
        'SELECT MAX(last_synced_at) as last_sync FROM tasks WHERE last_synced_at IS NOT NULL'
      );
      const lastSyncTimestamp = lastSyncResult?.last_sync || null;

      // Check connectivity
      const isOnline = await syncService.checkConnectivity();

      return res.json({
        pending_sync_count: pendingSyncCount,
        last_sync_timestamp: lastSyncTimestamp,
        is_online: isOnline,
        sync_queue_size: syncQueueSize
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to get sync status',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  });

  // Batch sync endpoint (for server-side)
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          error: 'Items array is required',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const processedItems = [];

      for (const item of items) {
        try {
          const { client_id, operation, data } = item;
          
          if (!client_id || !operation || !data) {
            processedItems.push({
              client_id: client_id || 'unknown',
              server_id: null,
              status: 'error',
              error: 'Missing required fields: client_id, operation, or data'
            });
            continue;
          }

          let result;
          switch (operation) {
            case 'create':
              result = await taskService.createTask(data);
              processedItems.push({
                client_id,
                server_id: result.id,
                status: 'success',
                resolved_data: result
              });
              break;
              
            case 'update':
              result = await taskService.updateTask(client_id, data);
              if (result) {
                processedItems.push({
                  client_id,
                  server_id: result.id,
                  status: 'success',
                  resolved_data: result
                });
              } else {
                processedItems.push({
                  client_id,
                  server_id: null,
                  status: 'error',
                  error: 'Task not found'
                });
              }
              break;
              
            case 'delete':
              const deleted = await taskService.deleteTask(client_id);
              if (deleted) {
                processedItems.push({
                  client_id,
                  server_id: client_id,
                  status: 'success'
                });
              } else {
                processedItems.push({
                  client_id,
                  server_id: null,
                  status: 'error',
                  error: 'Task not found'
                });
              }
              break;
              
            default:
              processedItems.push({
                client_id,
                server_id: null,
                status: 'error',
                error: `Unknown operation: ${operation}`
              });
          }
        } catch (error) {
          processedItems.push({
            client_id: item.client_id || 'unknown',
            server_id: null,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return res.json({
        processed_items: processedItems
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to process batch sync',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  });

  // Health check endpoint
  router.get('/health', async (_req: Request, res: Response) => {
    return res.json({ status: 'ok', timestamp: new Date() });
  });

  return router;
}