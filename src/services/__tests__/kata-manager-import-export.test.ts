import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { KataManagerService } from '../kata-manager'

// Mock fs module
vi.mock('fs')
vi.mock('adm-zip')

const mockFs = vi.mocked(fs)
const mockAdmZip = vi.mocked(AdmZip)

describe('KataManagerService Import/Export', () => {
  let kataManager: KataManagerService
  const testKatasDir = '/test/katas'

  beforeEach(() => {
    vi.clearAllMocks()
    KataManagerService.resetInstance()
    kataManager = KataManagerService.getInstance(testKatasDir)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('exportKata', () => {
    it('should export a valid kata to zip file', async () => {
      const mockZip = {
        addFile: vi.fn(),
        writeZip: vi.fn()
      }
      mockAdmZip.mockReturnValue(mockZip as any)

      // Mock kata path exists
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path === '/test/katas/test-kata') return true
        if (path.includes('meta.yaml')) return true
        if (path.includes('statement.md')) return true
        return false
      })

      // Mock directory reading
      mockFs.readdirSync.mockReturnValue(['meta.yaml', 'statement.md', 'entry.py'] as any)
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any)
      mockFs.readFileSync.mockReturnValue('file content')

      // Mock kata manager methods
      vi.spyOn(kataManager, 'getKataPath').mockResolvedValue('/test/katas/test-kata')
      vi.spyOn(kataManager, 'validateKataDirectory').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = await kataManager.exportKata('test-kata')

      expect(result).toBe(path.join('/test/katas', 'test-kata.zip'))
      expect(mockZip.writeZip).toHaveBeenCalledWith('/test/katas/test-kata.zip')
      expect(mockZip.addFile).toHaveBeenCalled()
    })

    it('should throw error for non-existent kata', async () => {
      vi.spyOn(kataManager, 'getKataPath').mockResolvedValue(null)

      await expect(kataManager.exportKata('non-existent')).rejects.toThrow('Kata not found: non-existent')
    })

    it('should throw error for invalid kata structure', async () => {
      vi.spyOn(kataManager, 'getKataPath').mockResolvedValue('/test/katas/invalid-kata')
      vi.spyOn(kataManager, 'validateKataDirectory').mockReturnValue({
        isValid: false,
        errors: ['Missing meta.yaml'],
        warnings: []
      })

      await expect(kataManager.exportKata('invalid-kata')).rejects.toThrow('Cannot export invalid kata: Missing meta.yaml')
    })
  })

  describe('importKata', () => {
    it('should import a valid kata zip file', async () => {
      const zipPath = '/test/kata.zip'
      const mockZipEntries = [
        { entryName: 'test-kata/meta.yaml' },
        { entryName: 'test-kata/statement.md' },
        { entryName: 'test-kata/entry.py' }
      ]

      const mockZip = {
        getEntries: vi.fn().mockReturnValue(mockZipEntries),
        extractAllTo: vi.fn()
      }
      mockAdmZip.mockReturnValue(mockZip as any)

      // Mock file system operations
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path === zipPath) return true
        if (path.includes('.temp_import_')) return true
        if (path.includes('test-kata') && path.includes('temp')) return true
        if (path.includes('meta.yaml')) return true
        if (path.includes('statement.md')) return true
        return false
      })

      mockFs.mkdirSync.mockImplementation(() => {})
      mockFs.readdirSync.mockImplementation((path: any, options?: any) => {
        if (options?.withFileTypes) {
          if (path.includes('.temp_import_')) {
            return [{ name: 'test-kata', isDirectory: () => true }] as any
          }
          return [
            { name: 'meta.yaml', isDirectory: () => false },
            { name: 'statement.md', isDirectory: () => false },
            { name: 'entry.py', isDirectory: () => false }
          ] as any
        }
        if (path.includes('.temp_import_')) return ['test-kata'] as any
        return ['meta.yaml', 'statement.md', 'entry.py'] as any
      })
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any)
      mockFs.renameSync.mockImplementation(() => {})
      mockFs.rmSync.mockImplementation(() => {})
      mockFs.readFileSync.mockReturnValue(`
slug: test-kata
title: Test Kata
language: py
type: code
difficulty: easy
tags: []
entry: entry.py
test:
  kind: programmatic
  file: tests.py
timeout_ms: 5000
`)

      // Mock validation methods
      vi.spyOn(kataManager, 'validateKataDirectory').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      await kataManager.importKata(zipPath)

      expect(mockZip.extractAllTo).toHaveBeenCalled()
      expect(mockFs.renameSync).toHaveBeenCalled()
    })

    it('should throw error for non-existent zip file', async () => {
      mockFs.existsSync.mockReturnValue(false)

      await expect(kataManager.importKata('/non-existent.zip')).rejects.toThrow('Zip file not found')
    })

    it('should throw error for empty zip file', async () => {
      const mockZip = {
        getEntries: vi.fn().mockReturnValue([])
      }
      mockAdmZip.mockReturnValue(mockZip as any)
      mockFs.existsSync.mockReturnValue(true)

      await expect(kataManager.importKata('/empty.zip')).rejects.toThrow('Zip file is empty')
    })

    it('should throw error for invalid zip structure', async () => {
      const mockZipEntries = [
        { entryName: 'some-file.txt' } // Missing required files
      ]

      const mockZip = {
        getEntries: vi.fn().mockReturnValue(mockZipEntries)
      }
      mockAdmZip.mockReturnValue(mockZip as any)
      mockFs.existsSync.mockReturnValue(true)

      await expect(kataManager.importKata('/invalid.zip')).rejects.toThrow('Invalid kata structure in zip')
    })

    it('should throw error for existing kata slug', async () => {
      const zipPath = '/test/kata.zip'
      const mockZipEntries = [
        { entryName: 'existing-kata/meta.yaml' },
        { entryName: 'existing-kata/statement.md' }
      ]

      const mockZip = {
        getEntries: vi.fn().mockReturnValue(mockZipEntries),
        extractAllTo: vi.fn()
      }
      mockAdmZip.mockReturnValue(mockZip as any)

      mockFs.existsSync.mockImplementation((path: any) => {
        if (path === zipPath) return true
        if (path.includes('.temp_import_')) return true
        if (path.includes('existing-kata') && path.includes('temp')) return true
        if (path.includes('meta.yaml')) return true
        if (path.includes('statement.md')) return true
        if (path === '/test/katas/existing-kata') return true // Kata already exists
        return false
      })

      mockFs.mkdirSync.mockImplementation(() => {})
      mockFs.readdirSync.mockImplementation((path: any, options?: any) => {
        if (options?.withFileTypes) {
          if (path.includes('.temp_import_')) {
            return [{ name: 'existing-kata', isDirectory: () => true }] as any
          }
          return [
            { name: 'meta.yaml', isDirectory: () => false },
            { name: 'statement.md', isDirectory: () => false }
          ] as any
        }
        if (path.includes('.temp_import_')) return ['existing-kata'] as any
        return ['meta.yaml', 'statement.md'] as any
      })
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any)
      mockFs.readFileSync.mockReturnValue(`
slug: existing-kata
title: Existing Kata
language: py
type: code
difficulty: easy
tags: []
entry: entry.py
test:
  kind: programmatic
  file: tests.py
timeout_ms: 5000
`)

      vi.spyOn(kataManager, 'validateKataDirectory').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      await expect(kataManager.importKata(zipPath)).rejects.toThrow("Kata with slug 'existing-kata' already exists")
    })
  })

  describe('importMultipleKatas', () => {
    it('should import multiple katas and return results', async () => {
      const zipPaths = ['/test/kata1.zip', '/test/kata2.zip', '/test/invalid.zip']

      // Mock successful import for first two, failure for third
      vi.spyOn(kataManager, 'importKata')
        .mockResolvedValueOnce(undefined) // kata1.zip succeeds
        .mockResolvedValueOnce(undefined) // kata2.zip succeeds
        .mockRejectedValueOnce(new Error('Invalid kata')) // invalid.zip fails

      const results = await kataManager.importMultipleKatas(zipPaths)

      expect(results.success).toEqual(['/test/kata1.zip', '/test/kata2.zip'])
      expect(results.failed).toEqual([
        { path: '/test/invalid.zip', error: 'Invalid kata' }
      ])
    })
  })

  describe('exportMultipleKatas', () => {
    it('should export multiple katas and return results', async () => {
      const slugs = ['kata1', 'kata2', 'invalid-kata']

      // Mock successful export for first two, failure for third
      vi.spyOn(kataManager, 'exportKata')
        .mockResolvedValueOnce('/test/kata1.zip') // kata1 succeeds
        .mockResolvedValueOnce('/test/kata2.zip') // kata2 succeeds
        .mockRejectedValueOnce(new Error('Kata not found')) // invalid-kata fails

      const results = await kataManager.exportMultipleKatas(slugs)

      expect(results.success).toEqual(['/test/kata1.zip', '/test/kata2.zip'])
      expect(results.failed).toEqual([
        { slug: 'invalid-kata', error: 'Kata not found' }
      ])
    })
  })

  describe('analyzeZipStructure', () => {
    it('should validate zip structure with required files', () => {
      const zipEntries = [
        { entryName: 'kata/meta.yaml' },
        { entryName: 'kata/statement.md' },
        { entryName: 'kata/entry.py' }
      ]

      const result = (kataManager as any).analyzeZipStructure(zipEntries)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should detect missing required files', () => {
      const zipEntries = [
        { entryName: 'kata/entry.py' } // Missing meta.yaml and statement.md
      ]

      const result = (kataManager as any).analyzeZipStructure(zipEntries)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing meta.yaml file')
      expect(result.errors).toContain('Missing statement.md file')
    })

    it('should warn about deeply nested structure', () => {
      const zipEntries = [
        { entryName: 'very/deep/nested/structure/kata/meta.yaml' },
        { entryName: 'very/deep/nested/structure/kata/statement.md' }
      ]

      const result = (kataManager as any).analyzeZipStructure(zipEntries)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Zip structure is deeply nested, this might cause issues')
    })
  })

  describe('findKataDirectory', () => {
    it('should find kata directory in extracted content', () => {
      mockFs.readdirSync.mockReturnValue(['meta.yaml', 'statement.md'] as any)

      const result = (kataManager as any).findKataDirectory('/test/extracted')

      expect(result).toBe('/test/extracted')
    })

    it('should find kata directory in subdirectory', () => {
      mockFs.readdirSync
        .mockReturnValueOnce([{ name: 'kata-folder', isDirectory: () => true }] as any)
        .mockReturnValueOnce(['meta.yaml', 'statement.md'] as any)

      const result = (kataManager as any).findKataDirectory('/test/extracted')

      expect(result).toBe(path.join('/test/extracted', 'kata-folder'))
    })

    it('should return null if no kata directory found', () => {
      mockFs.readdirSync.mockReturnValue(['some-file.txt'] as any)

      const result = (kataManager as any).findKataDirectory('/test/extracted')

      expect(result).toBe(null)
    })
  })
})