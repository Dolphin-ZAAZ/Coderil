import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../database';
import { Attempt, Progress } from '@/types';

import path from 'path';
import fs from 'fs';

// Mock electron app module
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => './test-data')
  }
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let testDbPath: string;

  beforeEach(async () => {
    // Ensure test data directory exists
    if (!fs.existsSync('./test-data')) {
      fs.mkdirSync('./test-data', { recursive: true });
    }
    
    testDbPath = path.join('./test-data', `kata-progress-${Date.now()}-${Math.random()}.db`);
    
    // Reset singleton instance first
    DatabaseService.resetInstance();

    // Create new instance for each test with unique database path
    dbService = await DatabaseService.getInstance(testDbPath);
  });

  afterEach(() => {
    // Clean up
    DatabaseService.resetInstance();
    
    // Try to remove test database file, but don't fail if it's locked
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (error) {
      // Ignore file locking errors on Windows
      console.warn(`Could not delete test database: ${error}`);
    }
  });

  describe('Database Initialization', () => {
    it('should create database with correct schema', () => {
      const db = dbService.getDatabase();
      
      // Check if tables exist
      const result = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      const tableNames = result[0] ? result[0].values.map((row: any) => row[0]) : [];
      
      expect(tableNames).toContain('attempts');
      expect(tableNames).toContain('progress');
      expect(tableNames).toContain('user_settings');
    });

    it('should insert default settings', () => {
      const autoContinue = dbService.getSetting('auto_continue_enabled');
      const theme = dbService.getSetting('theme');
      const fontSize = dbService.getSetting('editor_font_size');
      const autoSave = dbService.getSetting('auto_save_interval');

      expect(autoContinue).toBe('false');
      expect(theme).toBe('auto');
      expect(fontSize).toBe('14');
      expect(autoSave).toBe('1000');
    });
  });

  describe('Attempt Operations', () => {
    it('should save and retrieve attempts', () => {
      const attempt: Omit<Attempt, 'id'> = {
        kataId: 'test-kata',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        language: 'py',
        status: 'passed',
        score: 85.5,
        durationMs: 5000,
        code: 'def solution(): return True'
      };

      const attemptId = dbService.saveAttempt(attempt);
      expect(attemptId).toBeGreaterThan(0);

      const history = dbService.getAttemptHistory('test-kata');
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        id: attemptId,
        kataId: 'test-kata',
        language: 'py',
        status: 'passed',
        score: 85.5,
        durationMs: 5000,
        code: 'def solution(): return True'
      });
      expect(history[0].timestamp).toEqual(new Date('2024-01-01T10:00:00Z'));
    });

    it('should retrieve attempts in descending order by timestamp', () => {
      const attempt1: Omit<Attempt, 'id'> = {
        kataId: 'test-kata',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        language: 'py',
        status: 'failed',
        score: 30,
        durationMs: 3000,
        code: 'def solution(): return False'
      };

      const attempt2: Omit<Attempt, 'id'> = {
        kataId: 'test-kata',
        timestamp: new Date('2024-01-01T11:00:00Z'),
        language: 'py',
        status: 'passed',
        score: 90,
        durationMs: 4000,
        code: 'def solution(): return True'
      };

      dbService.saveAttempt(attempt1);
      dbService.saveAttempt(attempt2);

      const history = dbService.getAttemptHistory('test-kata');
      expect(history).toHaveLength(2);
      expect(history[0].timestamp).toEqual(new Date('2024-01-01T11:00:00Z'));
      expect(history[1].timestamp).toEqual(new Date('2024-01-01T10:00:00Z'));
    });
  });

  describe('Progress Operations', () => {
    it('should return null for non-existent progress', () => {
      const progress = dbService.getProgress('non-existent-kata');
      expect(progress).toBeNull();
    });

    it('should create and update progress', () => {
      const progressData: Partial<Progress> = {
        lastCode: 'def solution(): pass',
        bestScore: 75,
        lastStatus: 'passed',
        attemptsCount: 3,
        lastAttempt: new Date('2024-01-01T12:00:00Z')
      };

      dbService.updateProgress('test-kata', progressData);

      const progress = dbService.getProgress('test-kata');
      expect(progress).toMatchObject({
        kataId: 'test-kata',
        lastCode: 'def solution(): pass',
        bestScore: 75,
        lastStatus: 'passed',
        attemptsCount: 3
      });
      expect(progress?.lastAttempt).toEqual(new Date('2024-01-01T12:00:00Z'));
    });

    it('should update existing progress', () => {
      // Create initial progress
      dbService.updateProgress('test-kata', {
        lastCode: 'initial code',
        bestScore: 50,
        attemptsCount: 1
      });

      // Update progress
      dbService.updateProgress('test-kata', {
        bestScore: 80,
        attemptsCount: 2,
        lastStatus: 'passed'
      });

      const progress = dbService.getProgress('test-kata');
      expect(progress).toMatchObject({
        kataId: 'test-kata',
        lastCode: 'initial code', // Should remain unchanged
        bestScore: 80, // Should be updated
        lastStatus: 'passed', // Should be updated
        attemptsCount: 2 // Should be updated
      });
    });
  });

  describe('User Settings Operations', () => {
    it('should get and set individual settings', () => {
      dbService.setSetting('test_setting', 'test_value');
      const value = dbService.getSetting('test_setting');
      expect(value).toBe('test_value');
    });

    it('should return null for non-existent setting', () => {
      const value = dbService.getSetting('non_existent_setting');
      expect(value).toBeNull();
    });

    it('should update existing settings', () => {
      dbService.setSetting('auto_continue_enabled', 'true');
      const value = dbService.getSetting('auto_continue_enabled');
      expect(value).toBe('true');
    });

    it('should get all settings', () => {
      dbService.setSetting('custom_setting', 'custom_value');
      const allSettings = dbService.getAllSettings();
      
      expect(allSettings).toHaveProperty('auto_continue_enabled');
      expect(allSettings).toHaveProperty('theme');
      expect(allSettings).toHaveProperty('editor_font_size');
      expect(allSettings).toHaveProperty('auto_save_interval');
      expect(allSettings).toHaveProperty('custom_setting', 'custom_value');
    });
  });

  describe('Utility Methods', () => {
    it('should clear all data except default settings', () => {
      // Add some data
      dbService.saveAttempt({
        kataId: 'test-kata',
        timestamp: new Date(),
        language: 'py',
        status: 'passed',
        score: 90,
        durationMs: 5000,
        code: 'test code'
      });

      dbService.updateProgress('test-kata', {
        bestScore: 90,
        attemptsCount: 1
      });

      dbService.setSetting('custom_setting', 'custom_value');

      // Clear data
      dbService.clearAllData();

      // Check that data is cleared
      const attempts = dbService.getAttemptHistory('test-kata');
      const progress = dbService.getProgress('test-kata');
      const customSetting = dbService.getSetting('custom_setting');

      expect(attempts).toHaveLength(0);
      expect(progress).toBeNull();
      expect(customSetting).toBeNull();

      // Check that default settings remain
      const defaultSetting = dbService.getSetting('auto_continue_enabled');
      expect(defaultSetting).toBe('false');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid attempt status', () => {
      const attempt: any = {
        kataId: 'test-kata',
        timestamp: new Date(),
        language: 'py',
        status: 'invalid_status', // Invalid status
        score: 90,
        durationMs: 5000,
        code: 'test code'
      };

      expect(() => dbService.saveAttempt(attempt)).toThrow();
    });
  });
});