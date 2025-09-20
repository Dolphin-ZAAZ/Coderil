import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { Attempt, Progress } from '@/types';

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;
  private static instance: DatabaseService;
  private initialized = false;

  private constructor(dbPath?: string) {
    // Get user data directory for storing the database
    this.dbPath = dbPath || path.join(app.getPath('userData'), 'kata-progress.db');
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const SQL = await initSqlJs();

      // Try to load existing database file
      if (fs.existsSync(this.dbPath)) {
        const filebuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(filebuffer);
      } else {
        this.db = new SQL.Database();
      }

      this.initializeSchema();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private saveToFile(): void {
    if (this.db && this.initialized) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, data);
    }
  }

  public static async getInstance(dbPath?: string): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(dbPath);
      await DatabaseService.instance.initializeDatabase();
    }
    return DatabaseService.instance;
  }

  public static resetInstance(): void {
    if (DatabaseService.instance) {
      DatabaseService.instance.close();
      DatabaseService.instance = undefined as any;
    }
  }

  private initializeSchema(): void {
    if (!this.db) return;

    // Create attempts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kata_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        language TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'timeout', 'error')),
        score REAL NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        code TEXT NOT NULL
      )
    `);

    // Create progress table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS progress (
        kata_id TEXT PRIMARY KEY,
        last_code TEXT,
        best_score REAL DEFAULT 0,
        last_status TEXT,
        attempts_count INTEGER DEFAULT 0,
        last_attempt DATETIME
      )
    `);

    // Create user_settings table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_attempts_kata_id ON attempts(kata_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_attempts_timestamp ON attempts(timestamp)`);

    // Insert default settings if they don't exist
    const defaultSettings = [
      ['auto_continue_enabled', 'false'],
      ['theme', 'auto'],
      ['editor_font_size', '14'],
      ['auto_save_interval', '1000']
    ];

    for (const [key, value] of defaultSettings) {
      try {
        this.db.run(`INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)`, [key, value]);
      } catch (error) {
        console.warn('Failed to insert default setting:', key, error);
      }
    }

    this.saveToFile();
  }

  public close(): void {
    if (this.db) {
      this.saveToFile();
      this.db.close();
    }
  }

  // Attempt operations
  public saveAttempt(attempt: Omit<Attempt, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`
      INSERT INTO attempts (kata_id, timestamp, language, status, score, duration_ms, code)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      attempt.kataId,
      attempt.timestamp.toISOString(),
      attempt.language,
      attempt.status,
      attempt.score,
      attempt.durationMs,
      attempt.code
    ]);

    this.saveToFile();

    // Get the last inserted row id
    try {
      const result = this.db.exec('SELECT last_insert_rowid() as id');
      if (result[0] && result[0].values.length > 0) {
        const id = result[0].values[0][0] as number;
        return id > 0 ? id : 1;
      }
    } catch (error) {
      console.warn('Could not get last insert rowid:', error);
    }

    // Fallback: query for the maximum ID in the attempts table
    try {
      const result = this.db.exec('SELECT MAX(id) as maxId FROM attempts');
      if (result[0] && result[0].values.length > 0) {
        const maxId = result[0].values[0][0] as number;
        return maxId || 1;
      }
    } catch (error) {
      console.warn('Could not get max ID:', error);
    }

    return 1; // Return 1 as a fallback since we know the insert succeeded
  }

  public getAttemptHistory(kataId: string): Attempt[] {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(`
      SELECT id, kata_id as kataId, timestamp, language, status, score, duration_ms as durationMs, code
      FROM attempts
      WHERE kata_id = ?
      ORDER BY timestamp DESC
    `, [kataId]);

    if (!result[0]) return [];

    const columns = result[0].columns;
    const values = result[0].values;

    return values.map(row => {
      const obj: any = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return {
        ...obj,
        timestamp: new Date(obj.timestamp)
      };
    });
  }

  // Progress operations
  public getProgress(kataId: string): Progress | null {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(`
      SELECT kata_id as kataId, last_code as lastCode, best_score as bestScore, 
             last_status as lastStatus, attempts_count as attemptsCount, last_attempt as lastAttempt
      FROM progress
      WHERE kata_id = ?
    `, [kataId]);

    if (!result[0] || !result[0].values.length) return null;

    const columns = result[0].columns;
    const values = result[0].values[0];
    const obj: any = {};
    columns.forEach((col, index) => {
      obj[col] = values[index];
    });

    return {
      ...obj,
      lastAttempt: obj.lastAttempt ? new Date(obj.lastAttempt) : new Date()
    };
  }

  public updateProgress(kataId: string, progress: Partial<Progress>): void {
    // First, get current progress or create new record
    const current = this.getProgress(kataId);

    if (current) {
      // Update existing record
      const updates: string[] = [];
      const values: any[] = [];

      if (progress.lastCode !== undefined) {
        updates.push('last_code = ?');
        values.push(progress.lastCode);
      }
      if (progress.bestScore !== undefined) {
        updates.push('best_score = ?');
        values.push(progress.bestScore);
      }
      if (progress.lastStatus !== undefined) {
        updates.push('last_status = ?');
        values.push(progress.lastStatus);
      }
      if (progress.attemptsCount !== undefined) {
        updates.push('attempts_count = ?');
        values.push(progress.attemptsCount);
      }
      if (progress.lastAttempt !== undefined) {
        updates.push('last_attempt = ?');
        values.push(progress.lastAttempt.toISOString());
      }

      if (updates.length > 0) {
        values.push(kataId);
        this.db!.run(`
          UPDATE progress SET ${updates.join(', ')} WHERE kata_id = ?
        `, values);
        this.saveToFile();
      }
    } else {
      // Create new record
      this.db!.run(`
        INSERT INTO progress (kata_id, last_code, best_score, last_status, attempts_count, last_attempt)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        kataId,
        progress.lastCode || '',
        progress.bestScore || 0,
        progress.lastStatus || '',
        progress.attemptsCount || 0,
        progress.lastAttempt?.toISOString() || new Date().toISOString()
      ]);
      this.saveToFile();
    }
  }

  // User settings operations
  public getSetting(key: string): string | null {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT value FROM user_settings WHERE key = ?', [key]);
    if (!result[0] || !result[0].values.length) return null;
    return result[0].values[0][0] as string;
  }

  public setSetting(key: string, value: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`
      INSERT OR REPLACE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [key, value]);
    this.saveToFile();
  }

  public getAllSettings(): Record<string, string> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT key, value FROM user_settings');
    const settings: Record<string, string> = {};

    if (result[0]) {
      const values = result[0].values;

      values.forEach(row => {
        const key = row[0] as string;
        const value = row[1] as string;
        settings[key] = value;
      });
    }

    return settings;
  }

  // Utility methods for testing and maintenance
  public clearAllData(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM attempts');
    this.db.run('DELETE FROM progress');
    this.db.run("DELETE FROM user_settings WHERE key NOT IN ('auto_continue_enabled', 'theme', 'editor_font_size', 'auto_save_interval')");
    this.saveToFile();
  }

  public getDatabase(): any {
    return this.db;
  }
}