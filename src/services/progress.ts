import { Attempt, Progress } from '@/types';
import { DatabaseService } from './database';

export class ProgressService {
  private db: DatabaseService | null = null;

  constructor() {
    this.initializeDb();
  }

  private async initializeDb() {
    this.db = await DatabaseService.getInstance();
  }

  private async ensureDb(): Promise<DatabaseService> {
    if (!this.db) {
      this.db = await DatabaseService.getInstance();
    }
    return this.db;
  }

  /**
   * Save a new attempt and update progress accordingly
   */
  public async saveAttempt(attempt: Omit<Attempt, 'id'>): Promise<void> {
    try {
      const db = await this.ensureDb();
      
      // Save the attempt
      db.saveAttempt(attempt);

      // Get current progress
      const currentProgress = db.getProgress(attempt.kataId);
      
      // Calculate new progress values
      const newAttemptsCount = (currentProgress?.attemptsCount || 0) + 1;
      const newBestScore = Math.max(
        currentProgress?.bestScore || 0,
        attempt.score
      );

      // Update progress
      db.updateProgress(attempt.kataId, {
        bestScore: newBestScore,
        lastStatus: attempt.status,
        attemptsCount: newAttemptsCount,
        lastAttempt: attempt.timestamp
      });

    } catch (error) {
      console.error('Failed to save attempt:', error);
      throw new Error(`Failed to save attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get progress for a specific kata
   */
  public async getProgress(kataId: string): Promise<Progress | null> {
    try {
      const db = await this.ensureDb();
      return db.getProgress(kataId);
    } catch (error) {
      console.error('Failed to get progress:', error);
      throw new Error(`Failed to get progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update progress for a specific kata
   */
  public async updateProgress(kataId: string, progress: Partial<Progress>): Promise<void> {
    try {
      const db = await this.ensureDb();
      db.updateProgress(kataId, progress);
    } catch (error) {
      console.error('Failed to update progress:', error);
      throw new Error(`Failed to update progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get attempt history for a specific kata
   */
  public async getAttemptHistory(kataId: string): Promise<Attempt[]> {
    try {
      const db = await this.ensureDb();
      return db.getAttemptHistory(kataId);
    } catch (error) {
      console.error('Failed to get attempt history:', error);
      throw new Error(`Failed to get attempt history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get progress for all katas that have been attempted
   */
  public async getAllProgress(): Promise<Progress[]> {
    try {
      const db = await this.ensureDb();
      const sqlDb = db.getDatabase();
      const result = sqlDb.exec(`
        SELECT kata_id as kataId, last_code as lastCode, best_score as bestScore,
               last_status as lastStatus, attempts_count as attemptsCount, last_attempt as lastAttempt
        FROM progress
        ORDER BY last_attempt DESC
      `);

      if (!result[0]) return [];

      const columns = result[0].columns;
      const values = result[0].values;

      return values.map((row: any) => {
        const obj: any = {};
        columns.forEach((col: any, index: number) => {
          obj[col] = row[index];
        });
        return {
          ...obj,
          lastAttempt: new Date(obj.lastAttempt)
        };
      });
    } catch (error) {
      console.error('Failed to get all progress:', error);
      throw new Error(`Failed to get all progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save code for a kata (for autosave functionality)
   */
  public async saveCode(kataId: string, code: string): Promise<void> {
    try {
      const db = await this.ensureDb();
      db.updateProgress(kataId, { lastCode: code });
    } catch (error) {
      console.error('Failed to save code:', error);
      throw new Error(`Failed to save code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load saved code for a kata
   */
  public async loadCode(kataId: string): Promise<string | null> {
    try {
      const db = await this.ensureDb();
      const progress = db.getProgress(kataId);
      return progress?.lastCode ?? null;
    } catch (error) {
      console.error('Failed to load code:', error);
      return null;
    }
  }

  /**
   * Clear saved code for a kata
   */
  public async clearCode(kataId: string): Promise<void> {
    try {
      const db = await this.ensureDb();
      db.updateProgress(kataId, { lastCode: '' });
    } catch (error) {
      console.error('Failed to clear code:', error);
      throw new Error(`Failed to clear code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get statistics for a kata
   */
  public async getKataStats(kataId: string): Promise<{
    totalAttempts: number;
    bestScore: number;
    lastStatus: string;
    averageScore: number;
    passedAttempts: number;
  }> {
    try {
      const db = await this.ensureDb();
      const progress = db.getProgress(kataId);
      const attempts = db.getAttemptHistory(kataId);

      const totalAttempts = attempts.length;
      const bestScore = progress?.bestScore || 0;
      const lastStatus = progress?.lastStatus || 'not_attempted';
      const passedAttempts = attempts.filter(a => a.status === 'passed').length;
      const averageScore = totalAttempts > 0 
        ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts 
        : 0;

      return {
        totalAttempts,
        bestScore,
        lastStatus,
        averageScore,
        passedAttempts
      };
    } catch (error) {
      console.error('Failed to get kata stats:', error);
      throw new Error(`Failed to get kata stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}