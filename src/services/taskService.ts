import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';

export class TaskService {
  constructor(private db: Database) {}

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const task: Task = {
      id,
      title: taskData.title || '',
      description: taskData.description || '',
      completed: false,
      is_deleted: false,
      sync_status: 'pending',
      created_at: new Date(now),
      updated_at: new Date(now),
      last_synced_at: undefined,
      server_id: undefined,
    };

    await this.db.run(
      `INSERT INTO tasks (
        id, title, description, completed, is_deleted,
        sync_status, created_at, updated_at, last_synced_at, server_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        task.description,
        task.completed ? 1 : 0,
        task.is_deleted ? 1 : 0,
        task.sync_status,
        task.created_at,
        task.updated_at,
        task.last_synced_at,
        task.server_id,
      ]
    );

    // Add to sync queue
    await this.db.run(
      `INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [uuidv4(), task.id, 'create', JSON.stringify(task), now]
    );

    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = await this.getTask(id);
    if (!existing) return null;

    const updated: Task = {
      ...existing,
      ...updates,
      updated_at: new Date(),
      sync_status: 'pending',
    };

    await this.db.run(
      `UPDATE tasks SET title = ?, description = ?, completed = ?, 
        is_deleted = ?, sync_status = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.title,
        updated.description,
        updated.completed ? 1 : 0,
        updated.is_deleted ? 1 : 0,
        updated.sync_status,
        updated.updated_at,
        id,
      ]
    );

    await this.db.run(
      `INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [uuidv4(), id, 'update', JSON.stringify(updates), new Date().toISOString()]
    );

    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    const existing = await this.getTask(id);
    if (!existing) return false;

    const now = new Date().toISOString();

    await this.db.run(
      `UPDATE tasks SET is_deleted = 1, sync_status = 'pending', updated_at = ? WHERE id = ?`,
      [now, id]
    );

    await this.db.run(
      `INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [uuidv4(), id, 'delete', JSON.stringify({}), now]
    );

    return true;
  }

  async getTask(id: string): Promise<Task | null> {
    const row = await this.db.get(`SELECT * FROM tasks WHERE id = ?`, [id]);
    if (!row || row.is_deleted) return null;

    return {
      ...row,
      completed: !!row.completed,
      is_deleted: !!row.is_deleted,
    };
  }

  async getAllTasks(): Promise<Task[]> {
    const rows = await this.db.all(`SELECT * FROM tasks WHERE is_deleted = 0`);
    return rows.map((row: any) => ({
      ...row,
      completed: !!row.completed,
      is_deleted: !!row.is_deleted,
    }));
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    const rows = await this.db.all(
      `SELECT * FROM tasks WHERE sync_status IN ('pending', 'error')`
    );
    return rows.map((row: any) => ({
      ...row,
      completed: !!row.completed,
      is_deleted: !!row.is_deleted,
    }));
  }
}
