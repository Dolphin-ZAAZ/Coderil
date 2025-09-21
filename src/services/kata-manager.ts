import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { 
  Kata, 
  KataDetails, 
  KataMetadata, 
  TestConfig, 
  Rubric,
  ValidationResult,
  validateKataMetadata,
  validateKataStructure,
  validateRubric,
  FileSystemError
} from '@/types';

export class KataManagerService {
  private katasDirectory: string;
  private static instance: KataManagerService;

  private constructor(katasDirectory?: string) {
    // Default to katas directory in project root
    this.katasDirectory = katasDirectory || path.join(process.cwd(), 'katas');
  }

  public static getInstance(katasDirectory?: string): KataManagerService {
    if (!KataManagerService.instance) {
      KataManagerService.instance = new KataManagerService(katasDirectory);
    }
    return KataManagerService.instance;
  }

  public static resetInstance(): void {
    KataManagerService.instance = undefined as any;
  }

  /**
   * Scans the katas directory and loads all valid katas
   */
  public async loadKatas(): Promise<Kata[]> {
    try {
      if (!fs.existsSync(this.katasDirectory)) {
        console.warn(`Katas directory does not exist: ${this.katasDirectory}`);
        return [];
      }

      const entries = fs.readdirSync(this.katasDirectory, { withFileTypes: true });
      const kataDirectories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

      const katas: Kata[] = [];

      for (const dirName of kataDirectories) {
        try {
          const kataPath = path.join(this.katasDirectory, dirName);
          const kata = await this.loadKataBasic(kataPath, dirName);
          if (kata) {
            katas.push(kata);
          }
        } catch (error) {
          console.warn(`Failed to load kata from directory ${dirName}:`, error);
          // Continue loading other katas even if one fails
        }
      }

      return katas;
    } catch (error) {
      const fsError = new Error(`Failed to scan katas directory: ${error}`) as FileSystemError;
      fsError.code = 'SCAN_FAILED';
      fsError.path = this.katasDirectory;
      throw fsError;
    }
  }

  /**
   * Loads basic kata information (for kata list)
   */
  private async loadKataBasic(kataPath: string, dirName: string): Promise<Kata | null> {
    const validation = this.validateKataDirectory(kataPath);
    if (!validation.isValid) {
      console.warn(`Invalid kata structure in ${dirName}:`, validation.errors);
      return null;
    }

    const metadata = await this.loadKataMetadata(kataPath);
    if (!metadata) {
      return null;
    }

    return {
      slug: metadata.slug,
      title: metadata.title,
      language: metadata.language,
      type: metadata.type,
      difficulty: metadata.difficulty,
      tags: metadata.tags || [],
      path: kataPath
    };
  }

  /**
   * Loads complete kata details including statement and starter code
   */
  public async loadKata(slug: string): Promise<KataDetails> {
    const katas = await this.loadKatas();
    const kata = katas.find(k => k.slug === slug);
    
    if (!kata) {
      const error = new Error(`Kata not found: ${slug}`) as FileSystemError;
      error.code = 'KATA_NOT_FOUND';
      throw error;
    }

    try {
      const metadata = await this.loadKataMetadata(kata.path);
      if (!metadata) {
        throw new Error('Failed to load kata metadata');
      }

      const statement = await this.loadStatement(kata.path);
      const starterCode = await this.loadStarterCode(kata.path, metadata.entry);
      const testConfig = this.createTestConfig(metadata);
      const rubric = await this.loadRubric(kata.path, metadata);

      return {
        ...kata,
        statement,
        metadata,
        starterCode,
        testConfig,
        rubric
      };
    } catch (error) {
      const fsError = new Error(`Failed to load kata details for ${slug}: ${error}`) as FileSystemError;
      fsError.code = 'LOAD_FAILED';
      fsError.path = kata.path;
      throw fsError;
    }
  }

  /**
   * Validates kata directory structure
   */
  public validateKataDirectory(kataPath: string): ValidationResult {
    try {
      if (!fs.existsSync(kataPath)) {
        return {
          isValid: false,
          errors: ['Kata directory does not exist'],
          warnings: []
        };
      }

      const files = fs.readdirSync(kataPath);
      return validateKataStructure(kataPath, files);
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to read directory: ${error}`],
        warnings: []
      };
    }
  }

  /**
   * Loads and validates kata metadata from meta.yaml
   */
  private async loadKataMetadata(kataPath: string): Promise<KataMetadata | null> {
    const metaPath = path.join(kataPath, 'meta.yaml');
    
    if (!fs.existsSync(metaPath)) {
      console.warn(`Missing meta.yaml in ${kataPath}`);
      return null;
    }

    try {
      const metaContent = fs.readFileSync(metaPath, 'utf8');
      const metadata = yaml.load(metaContent) as any;

      const validation = validateKataMetadata(metadata);
      if (!validation.isValid) {
        console.warn(`Invalid metadata in ${kataPath}:`, validation.errors);
        return null;
      }

      if (validation.warnings.length > 0) {
        console.warn(`Metadata warnings in ${kataPath}:`, validation.warnings);
      }

      return metadata as KataMetadata;
    } catch (error) {
      console.warn(`Failed to parse meta.yaml in ${kataPath}:`, error);
      return null;
    }
  }

  /**
   * Loads kata statement from statement.md
   */
  private async loadStatement(kataPath: string): Promise<string> {
    const statementPath = path.join(kataPath, 'statement.md');
    
    if (!fs.existsSync(statementPath)) {
      throw new Error('Missing statement.md file');
    }

    try {
      return fs.readFileSync(statementPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read statement.md: ${error}`);
    }
  }

  /**
   * Loads starter code from the entry file
   */
  private async loadStarterCode(kataPath: string, entryFile: string): Promise<string> {
    const entryPath = path.join(kataPath, entryFile);
    
    // For template katas, entry might be a directory
    if (fs.existsSync(entryPath) && fs.statSync(entryPath).isDirectory()) {
      // For template katas, return empty string as starter code
      // The actual template files will be handled separately
      return '';
    }

    if (!fs.existsSync(entryPath)) {
      console.warn(`Entry file not found: ${entryPath}, returning empty starter code`);
      return '';
    }

    try {
      return fs.readFileSync(entryPath, 'utf8');
    } catch (error) {
      console.warn(`Failed to read entry file ${entryPath}:`, error);
      return '';
    }
  }

  /**
   * Creates test configuration from metadata
   */
  private createTestConfig(metadata: KataMetadata): TestConfig {
    const testConfig: TestConfig = {
      kind: metadata.test.kind,
      publicTestFile: metadata.test.file,
      timeoutMs: metadata.timeout_ms
    };

    // Look for hidden test file (common naming patterns)
    if (metadata.test.file && metadata.test.kind !== 'none') {
      const testDir = path.dirname(metadata.test.file);
      const testName = path.basename(metadata.test.file, path.extname(metadata.test.file));
      const testExt = path.extname(metadata.test.file);
      
      const hiddenTestPatterns = [
        `hidden_${testName}${testExt}`,
        `${testName}_hidden${testExt}`,
        `hidden${testExt}`,
        `secret${testExt}`
      ];

      for (const pattern of hiddenTestPatterns) {
        const hiddenPath = testDir ? path.join(testDir, pattern) : pattern;
        if (fs.existsSync(path.join(path.dirname(metadata.entry), hiddenPath))) {
          testConfig.hiddenTestFile = hiddenPath;
          break;
        }
      }
    }

    return testConfig;
  }

  /**
   * Loads rubric for explanation and template katas
   */
  private async loadRubric(kataPath: string, metadata: KataMetadata): Promise<Rubric | undefined> {
    // Only explanation and template katas have rubrics
    if (metadata.type !== 'explain' && metadata.type !== 'template') {
      return undefined;
    }

    // Check if rubric is defined in metadata
    if ((metadata as any).rubric) {
      const rubricValidation = validateRubric((metadata as any).rubric);
      if (rubricValidation.isValid) {
        return (metadata as any).rubric as Rubric;
      } else {
        console.warn(`Invalid rubric in ${kataPath}:`, rubricValidation.errors);
      }
    }

    // Try to load from separate rubric.yaml file
    const rubricPath = path.join(kataPath, 'rubric.yaml');
    if (fs.existsSync(rubricPath)) {
      try {
        const rubricContent = fs.readFileSync(rubricPath, 'utf8');
        const rubric = yaml.load(rubricContent) as any;
        
        const validation = validateRubric(rubric);
        if (validation.isValid) {
          return rubric as Rubric;
        } else {
          console.warn(`Invalid rubric file in ${kataPath}:`, validation.errors);
        }
      } catch (error) {
        console.warn(`Failed to parse rubric.yaml in ${kataPath}:`, error);
      }
    }

    // Return default rubric for explanation/template katas
    console.warn(`No valid rubric found for ${metadata.type} kata in ${kataPath}, using default`);
    return {
      keys: metadata.type === 'explain' 
        ? ['correctness', 'clarity', 'completeness'] 
        : ['structure', 'completeness', 'best_practices'],
      threshold: {
        min_total: 60,
        min_correctness: 50
      }
    };
  }

  /**
   * Imports a kata from a zip file
   */
  public async importKata(_zipPath: string): Promise<void> {
    // This is a placeholder for the import functionality
    // Will be implemented in task 15
    throw new Error('Kata import functionality not yet implemented');
  }

  /**
   * Exports a kata to a zip file
   */
  public async exportKata(_slug: string): Promise<string> {
    // This is a placeholder for the export functionality
    // Will be implemented in task 15
    throw new Error('Kata export functionality not yet implemented');
  }

  /**
   * Gets the katas directory path
   */
  public getKatasDirectory(): string {
    return this.katasDirectory;
  }

  /**
   * Sets a new katas directory path
   */
  public setKatasDirectory(directory: string): void {
    this.katasDirectory = directory;
  }

  /**
   * Refreshes the kata cache (useful after importing new katas)
   */
  public async refreshKatas(): Promise<Kata[]> {
    return this.loadKatas();
  }

  /**
   * Checks if a kata exists
   */
  public async kataExists(slug: string): Promise<boolean> {
    try {
      const katas = await this.loadKatas();
      return katas.some(kata => kata.slug === slug);
    } catch {
      return false;
    }
  }

  /**
   * Gets kata directory path by slug
   */
  public async getKataPath(slug: string): Promise<string | null> {
    try {
      const katas = await this.loadKatas();
      const kata = katas.find(k => k.slug === slug);
      return kata ? kata.path : null;
    } catch {
      return null;
    }
  }
}