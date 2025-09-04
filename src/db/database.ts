// src/db/database.ts
import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';

export class Database {
  private db!: SQLiteDatabase;

  constructor(private filename: string) {}

  async initialize(): Promise<void> {
    this.db = await open({
      filename: this.filename,
      driver: sqlite3.Database,
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        completed INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT,
        updated_at TEXT,
        last_synced_at TEXT,
        server_id TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        operation TEXT,
        data TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        retry_count INTEGER DEFAULT 0,
        error_message TEXT
      );
    `);
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    await this.db.run(sql, params);
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return this.db.get<T>(sql, params);
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.db.all<T[]>(sql, params);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }
}
