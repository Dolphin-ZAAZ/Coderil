import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { KataManagerService } from '../kata-manager';
import { KataMetadata, Kata } from '@/types';

// Mock fs module
vi.mock('fs');
const mockFs = vi.mocked(fs);

// Mock yaml module
vi.mock('js-yaml');
const mockYaml = vi.mocked(yaml);

describe('KataManagerService', () => {
    let service: KataManagerService;
    const testKatasDir = '/test/katas';

    beforeEach(() => {
        vi.clearAllMocks();
        KataManagerService.resetInstance();
        service = KataManagerService.getInstance(testKatasDir);
    });

    afterEach(() => {
        KataManagerService.resetInstance();
    });

    describe('loadKatas', () => {
        it('should return empty array when katas directory does not exist', async () => {
            mockFs.existsSync.mockReturnValue(false);

            const result = await service.loadKatas();

            expect(result).toEqual([]);
            expect(mockFs.existsSync).toHaveBeenCalledWith(testKatasDir);
        });

        it('should load valid katas from directory', async () => {
            const mockMetadata: KataMetadata = {
                slug: 'test-kata',
                title: 'Test Kata',
                language: 'py',
                type: 'code',
                difficulty: 'easy',
                tags: ['test'],
                entry: 'main.py',
                test: { kind: 'programmatic', file: 'test.py' },
                timeout_ms: 5000
            };

            // Mock directory structure
            mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                const pathStr = filePath.toString();
                if (pathStr === testKatasDir) return true;
                if (pathStr === path.join(testKatasDir, 'test-kata')) return true;
                if (pathStr === path.join(testKatasDir, 'test-kata', 'meta.yaml')) return true;
                if (pathStr === path.join(testKatasDir, 'test-kata', 'statement.md')) return true;
                if (pathStr === path.join(testKatasDir, 'test-kata', 'main.py')) return true;
                return false;
            });

            mockFs.readdirSync.mockImplementation((dirPath: fs.PathLike) => {
                const pathStr = dirPath.toString();
                if (pathStr === testKatasDir) {
                    return [{ name: 'test-kata', isDirectory: () => true }] as any;
                }
                if (pathStr === path.join(testKatasDir, 'test-kata')) {
                    return ['meta.yaml', 'statement.md', 'main.py'];
                }
                return [];
            });

            mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
                const pathStr = filePath.toString();
                if (pathStr.endsWith('meta.yaml')) {
                    return 'slug: test-kata\ntitle: Test Kata';
                }
                return '';
            });

            mockYaml.load.mockReturnValue(mockMetadata);

            const result = await service.loadKatas();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                slug: 'test-kata',
                title: 'Test Kata',
                language: 'py',
                type: 'code',
                difficulty: 'easy',
                tags: ['test'],
                path: path.join(testKatasDir, 'test-kata')
            });
        });

        // Note: Test for invalid kata handling is covered by integration tests

        it('should throw error when directory scan fails', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            await expect(service.loadKatas()).rejects.toThrow('Failed to scan katas directory');
        });
    });

    describe('loadKata', () => {
        it('should load complete kata details', async () => {
            const mockMetadata: KataMetadata = {
                slug: 'test-kata',
                title: 'Test Kata',
                language: 'py',
                type: 'code',
                difficulty: 'easy',
                tags: ['test'],
                entry: 'main.py',
                test: { kind: 'programmatic', file: 'test.py' },
                timeout_ms: 5000
            };

            // Mock loadKatas to return a kata
            vi.spyOn(service, 'loadKatas').mockResolvedValue([{
                slug: 'test-kata',
                title: 'Test Kata',
                language: 'py',
                type: 'code',
                difficulty: 'easy',
                tags: ['test'],
                path: path.join(testKatasDir, 'test-kata')
            }]);

            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
            mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
                const pathStr = filePath.toString();
                if (pathStr.endsWith('meta.yaml')) return 'slug: test-kata';
                if (pathStr.endsWith('statement.md')) return '# Test Kata\nThis is a test kata.';
                if (pathStr.endsWith('main.py')) return 'def solution():\n    pass';
                return '';
            });

            mockYaml.load.mockReturnValue(mockMetadata);

            const result = await service.loadKata('test-kata');

            expect(result).toEqual({
                slug: 'test-kata',
                title: 'Test Kata',
                language: 'py',
                type: 'code',
                difficulty: 'easy',
                tags: ['test'],
                path: path.join(testKatasDir, 'test-kata'),
                statement: '# Test Kata\nThis is a test kata.',
                metadata: mockMetadata,
                starterCode: 'def solution():\n    pass',
                testConfig: {
                    kind: 'programmatic',
                    publicTestFile: 'test.py',
                    timeoutMs: 5000,
                    hiddenTestFile: 'hidden_test.py'
                },
                rubric: undefined
            });
        });

        it('should throw error when kata not found', async () => {
            vi.spyOn(service, 'loadKatas').mockResolvedValue([]);

            await expect(service.loadKata('nonexistent')).rejects.toThrow('Kata not found: nonexistent');
        });

        it('should load rubric for explanation katas', async () => {
            const mockMetadata: any = {
                slug: 'explain-kata',
                title: 'Explain Kata',
                language: 'py',
                type: 'explain',
                difficulty: 'medium',
                tags: ['explanation'],
                entry: 'explanation.md',
                test: { kind: 'none', file: 'none' },
                timeout_ms: 10000,
                rubric: {
                    keys: ['correctness', 'clarity'],
                    threshold: { min_total: 70, min_correctness: 60 }
                }
            };

            vi.spyOn(service, 'loadKatas').mockResolvedValue([{
                slug: 'explain-kata',
                title: 'Explain Kata',
                language: 'py',
                type: 'explain',
                difficulty: 'medium',
                tags: ['explanation'],
                path: path.join(testKatasDir, 'explain-kata')
            }]);

            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
            mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
                const pathStr = filePath.toString();
                if (pathStr.endsWith('meta.yaml')) return 'slug: explain-kata';
                if (pathStr.endsWith('statement.md')) return '# Explain this concept';
                if (pathStr.endsWith('explanation.md')) return '';
                return '';
            });

            mockYaml.load.mockReturnValue(mockMetadata);

            const result = await service.loadKata('explain-kata');

            expect(result.rubric).toEqual({
                keys: ['correctness', 'clarity'],
                threshold: { min_total: 70, min_correctness: 60 }
            });
        });

        it('should handle template katas with directory entry', async () => {
            const mockMetadata: KataMetadata = {
                slug: 'template-kata',
                title: 'Template Kata',
                language: 'js',
                type: 'template',
                difficulty: 'easy',
                tags: ['template'],
                entry: 'template/',
                test: { kind: 'none', file: 'none' },
                timeout_ms: 8000
            };

            vi.spyOn(service, 'loadKatas').mockResolvedValue([{
                slug: 'template-kata',
                title: 'Template Kata',
                language: 'js',
                type: 'template',
                difficulty: 'easy',
                tags: ['template'],
                path: path.join(testKatasDir, 'template-kata')
            }]);

            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
            mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
                const pathStr = filePath.toString();
                if (pathStr.endsWith('meta.yaml')) return 'slug: template-kata';
                if (pathStr.endsWith('statement.md')) return '# Create a template';
                return '';
            });

            mockYaml.load.mockReturnValue(mockMetadata);

            const result = await service.loadKata('template-kata');

            expect(result.starterCode).toBe(''); // Empty for template katas
            expect(result.type).toBe('template');
        });
    });

    describe('validateKataDirectory', () => {
        it('should return invalid for non-existent directory', () => {
            mockFs.existsSync.mockReturnValue(false);

            const result = service.validateKataDirectory('/nonexistent');

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Kata directory does not exist');
        });

        it('should validate directory structure', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(['meta.yaml', 'statement.md', 'main.py'] as any);

            const result = service.validateKataDirectory('/test/kata');

            expect(result.isValid).toBe(true);
        });

        it('should return errors for missing required files', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(['main.py'] as any); // Missing meta.yaml and statement.md

            const result = service.validateKataDirectory('/test/kata');

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Missing required file: meta.yaml');
            expect(result.errors).toContain('Missing required file: statement.md');
        });

        it('should handle directory read errors', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            const result = service.validateKataDirectory('/test/kata');

            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('Failed to read directory');
        });
    });

    describe('utility methods', () => {
        it('should check if kata exists', async () => {
            vi.spyOn(service, 'loadKatas').mockResolvedValue([
                { slug: 'existing-kata' } as Kata
            ]);

            const exists = await service.kataExists('existing-kata');
            const notExists = await service.kataExists('nonexistent-kata');

            expect(exists).toBe(true);
            expect(notExists).toBe(false);
        });

        it('should get kata path by slug', async () => {
            const testPath = '/test/path/kata';
            vi.spyOn(service, 'loadKatas').mockResolvedValue([
                { slug: 'test-kata', path: testPath } as Kata
            ]);

            const path = await service.getKataPath('test-kata');
            const nullPath = await service.getKataPath('nonexistent');

            expect(path).toBe(testPath);
            expect(nullPath).toBe(null);
        });

        it('should get and set katas directory', () => {
            expect(service.getKatasDirectory()).toBe(testKatasDir);

            service.setKatasDirectory('/new/path');
            expect(service.getKatasDirectory()).toBe('/new/path');
        });

        it('should refresh katas', async () => {
            const mockKatas = [{ slug: 'test' } as Kata];
            vi.spyOn(service, 'loadKatas').mockResolvedValue(mockKatas);

            const result = await service.refreshKatas();

            expect(result).toBe(mockKatas);
        });
    });

    describe('import/export placeholders', () => {
        it('should throw error for import (not implemented)', async () => {
            await expect(service.importKata('/test.zip')).rejects.toThrow('not yet implemented');
        });

        it('should throw error for export (not implemented)', async () => {
            await expect(service.exportKata('test')).rejects.toThrow('not yet implemented');
        });
    });

    describe('singleton pattern', () => {
        it('should return same instance', () => {
            const instance1 = KataManagerService.getInstance();
            const instance2 = KataManagerService.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should reset instance', () => {
            const instance1 = KataManagerService.getInstance();
            KataManagerService.resetInstance();
            const instance2 = KataManagerService.getInstance();

            expect(instance1).not.toBe(instance2);
        });
    });
});