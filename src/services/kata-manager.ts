import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import AdmZip from 'adm-zip';
import { 
  Kata, 
  KataDetails, 
  KataMetadata, 
  TestConfig, 
  Rubric,

  ShortformConfig,
  OneLinerConfig,
  MultiQuestionConfig,
  ValidationResult,
  validateKataMetadata,
  validateKataStructure,
  validateRubric,

  validateShortformConfig,
  validateOneLinerConfig,
  validateMultiQuestionConfig,
  FileSystemError
} from '@/types';
import { errorHandler } from './error-handler';

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
        const fsError = new Error(`Katas directory does not exist: ${this.katasDirectory}`) as FileSystemError;
        fsError.code = 'ENOENT';
        fsError.path = this.katasDirectory;
        errorHandler.handleFileSystemError(fsError, {
          operation: 'load_katas',
          directory: this.katasDirectory
        });
        return [];
      }

      const entries = fs.readdirSync(this.katasDirectory, { withFileTypes: true });
      const kataDirectories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

      const katas: Kata[] = [];
      const failedKatas: string[] = [];

      for (const dirName of kataDirectories) {
        try {
          const kataPath = path.join(this.katasDirectory, dirName);
          const kata = await this.loadKataBasic(kataPath, dirName);
          if (kata) {
            katas.push(kata);
          }
        } catch (error) {
          failedKatas.push(dirName);
          const fsError = new Error(`Failed to load kata from directory ${dirName}: ${error}`) as FileSystemError;
          fsError.code = 'KATA_LOAD_FAILED';
          fsError.path = path.join(this.katasDirectory, dirName);
          errorHandler.handleFileSystemError(fsError, {
            operation: 'load_individual_kata',
            kataDirectory: dirName,
            recoverable: true
          });
          // Continue loading other katas even if one fails
        }
      }

      // Log summary if some katas failed to load
      if (failedKatas.length > 0) {
        console.warn(`Failed to load ${failedKatas.length} kata(s): ${failedKatas.join(', ')}`);
      }

      return katas;
    } catch (error) {
      const fsError = new Error(`Failed to scan katas directory: ${error}`) as FileSystemError;
      fsError.code = 'SCAN_FAILED';
      fsError.path = this.katasDirectory;
      errorHandler.handleFileSystemError(fsError, {
        operation: 'scan_katas_directory',
        directory: this.katasDirectory
      });
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
      const solutionCode = await this.loadSolutionCode(kata.path, metadata);
      const shortformConfigs = await this.loadShortformConfigs(kata.path, metadata);

      return {
        ...kata,
        statement,
        metadata,
        starterCode,
        testConfig,
        rubric,
        solutionCode,
        ...shortformConfigs
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
   * Loads solution code if available
   */
  private async loadSolutionCode(kataPath: string, metadata: KataMetadata): Promise<string | undefined> {
    // Check if solution file is specified in metadata
    if (metadata.solution) {
      const solutionPath = path.join(kataPath, metadata.solution);
      if (fs.existsSync(solutionPath)) {
        try {
          return fs.readFileSync(solutionPath, 'utf8');
        } catch (error) {
          console.warn(`Failed to read solution file ${solutionPath}:`, error);
        }
      }
    }

    // Try common solution file patterns
    const solutionPatterns = [
      'solution.' + this.getFileExtension(metadata.language),
      'answer.' + this.getFileExtension(metadata.language),
      'reference.' + this.getFileExtension(metadata.language),
      'solution_' + metadata.slug + '.' + this.getFileExtension(metadata.language)
    ];

    for (const pattern of solutionPatterns) {
      const solutionPath = path.join(kataPath, pattern);
      if (fs.existsSync(solutionPath)) {
        try {
          return fs.readFileSync(solutionPath, 'utf8');
        } catch (error) {
          console.warn(`Failed to read solution file ${solutionPath}:`, error);
        }
      }
    }

    return undefined;
  }

  /**
   * Gets file extension for a language
   */
  private getFileExtension(language: string): string {
    switch (language) {
      case 'py': return 'py';
      case 'js': return 'js';
      case 'ts': return 'ts';
      case 'cpp': return 'cpp';
      default: return 'txt';
    }
  }

  /**
   * Loads rubric for explanation, template, and shortform katas
   */
  private async loadRubric(kataPath: string, metadata: KataMetadata): Promise<Rubric | undefined> {
    // Only explanation, template, and shortform katas have rubrics
    if (!['explain', 'template', 'shortform', 'one-liner', 'multi-question'].includes(metadata.type)) {
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

    // Return default rubric based on kata type
    console.warn(`No valid rubric found for ${metadata.type} kata in ${kataPath}, using default`);
    
    let keys: string[];
    switch (metadata.type) {
      case 'explain':
        keys = ['correctness', 'clarity', 'completeness'];
        break;
      case 'template':
        keys = ['structure', 'completeness', 'best_practices'];
        break;
      case 'shortform':
      case 'one-liner':
        keys = ['correctness', 'clarity'];
        break;
      default:
        keys = ['correctness'];
    }
    
    return {
      keys,
      threshold: {
        min_total: 60,
        min_correctness: 50
      }
    };
  }

  /**
   * Loads shortform configurations for shortform kata types
   */
  private async loadShortformConfigs(kataPath: string, metadata: KataMetadata): Promise<{
    multiQuestionConfig?: MultiQuestionConfig,

    shortformConfig?: ShortformConfig,
    oneLinerConfig?: OneLinerConfig
  }> {
    const configs: any = {};

    // First try to load multi-question config (new format)
    const multiQuestionConfig = await this.loadMultiQuestionConfig(kataPath, metadata);
    if (multiQuestionConfig) {
      configs.multiQuestionConfig = multiQuestionConfig;
      return configs; // If multi-question config exists, use it exclusively
    }

    // Fall back to legacy single-question configs
    if (metadata.type === 'shortform') {
      configs.shortformConfig = await this.loadShortformConfig(kataPath, metadata);
    } else if (metadata.type === 'one-liner') {
      configs.oneLinerConfig = await this.loadOneLinerConfig(kataPath, metadata);
    }

    return configs;
  }

  /**
   * Loads multi-question configuration (new format)
   */
  private async loadMultiQuestionConfig(kataPath: string, metadata: KataMetadata): Promise<MultiQuestionConfig | undefined> {
    // Check if config is embedded in metadata
    if ((metadata as any).multiQuestion) {
      const validation = validateMultiQuestionConfig((metadata as any).multiQuestion);
      if (validation.isValid) {
        return (metadata as any).multiQuestion as MultiQuestionConfig;
      } else {
        console.warn(`Invalid multi-question config in ${kataPath}:`, validation.errors);
      }
    }

    // Try to load from separate config.yaml file
    const configPath = path.join(kataPath, 'config.yaml');
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(configContent) as any;
        
        if (config.multiQuestion) {
          const validation = validateMultiQuestionConfig(config.multiQuestion);
          if (validation.isValid) {
            return config.multiQuestion as MultiQuestionConfig;
          } else {
            console.warn(`Invalid multi-question config in ${kataPath}:`, validation.errors);
          }
        }
      } catch (error) {
        console.warn(`Failed to parse config.yaml in ${kataPath}:`, error);
      }
    }

    return undefined;
  }



  /**
   * Loads shortform configuration
   */
  private async loadShortformConfig(kataPath: string, metadata: KataMetadata): Promise<ShortformConfig | undefined> {
    // Check if config is embedded in metadata
    if ((metadata as any).shortform) {
      const validation = validateShortformConfig((metadata as any).shortform);
      if (validation.isValid) {
        return (metadata as any).shortform as ShortformConfig;
      } else {
        console.warn(`Invalid shortform config in ${kataPath}:`, validation.errors);
      }
    }

    // Try to load from separate config.yaml file
    const configPath = path.join(kataPath, 'config.yaml');
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(configContent) as any;
        
        if (config.shortform) {
          const validation = validateShortformConfig(config.shortform);
          if (validation.isValid) {
            return config.shortform as ShortformConfig;
          } else {
            console.warn(`Invalid shortform config in ${kataPath}:`, validation.errors);
          }
        }
      } catch (error) {
        console.warn(`Failed to parse config.yaml in ${kataPath}:`, error);
      }
    }

    return undefined;
  }

  /**
   * Loads one-liner configuration
   */
  private async loadOneLinerConfig(kataPath: string, metadata: KataMetadata): Promise<OneLinerConfig | undefined> {
    // Check if config is embedded in metadata
    if ((metadata as any).oneLiner) {
      const validation = validateOneLinerConfig((metadata as any).oneLiner);
      if (validation.isValid) {
        return (metadata as any).oneLiner as OneLinerConfig;
      } else {
        console.warn(`Invalid one-liner config in ${kataPath}:`, validation.errors);
      }
    }

    // Try to load from separate config.yaml file
    const configPath = path.join(kataPath, 'config.yaml');
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(configContent) as any;
        
        if (config.oneLiner) {
          const validation = validateOneLinerConfig(config.oneLiner);
          if (validation.isValid) {
            return config.oneLiner as OneLinerConfig;
          } else {
            console.warn(`Invalid one-liner config in ${kataPath}:`, validation.errors);
          }
        }
      } catch (error) {
        console.warn(`Failed to parse config.yaml in ${kataPath}:`, error);
      }
    }

    return undefined;
  }

  /**
   * Imports a kata from a zip file
   */
  public async importKata(zipPath: string): Promise<void> {
    if (!fs.existsSync(zipPath)) {
      const error = new Error(`Zip file not found: ${zipPath}`) as FileSystemError;
      error.code = 'FILE_NOT_FOUND';
      error.path = zipPath;
      throw error;
    }

    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      if (zipEntries.length === 0) {
        throw new Error('Zip file is empty');
      }

      // Find the kata directory structure in the zip
      const kataStructure = this.analyzeZipStructure(zipEntries);
      
      if (!kataStructure.isValid) {
        throw new Error(`Invalid kata structure in zip: ${kataStructure.errors.join(', ')}`);
      }

      // Extract to temporary directory first for validation
      const tempDir = path.join(this.katasDirectory, '.temp_import_' + Date.now());
      
      try {
        // Create temp directory
        fs.mkdirSync(tempDir, { recursive: true });

        // Extract zip contents
        zip.extractAllTo(tempDir, true);

        // Find the actual kata directory in the extracted content
        const kataDir = this.findKataDirectory(tempDir);
        if (!kataDir) {
          throw new Error('No valid kata directory found in zip file');
        }

        // Validate the extracted kata
        const validation = this.validateKataDirectory(kataDir);
        if (!validation.isValid) {
          throw new Error(`Invalid kata structure: ${validation.errors.join(', ')}`);
        }

        // Load metadata to get the kata slug
        const metadata = await this.loadKataMetadata(kataDir);
        if (!metadata) {
          throw new Error('Failed to load kata metadata from imported zip');
        }

        // Check if kata already exists
        const targetDir = path.join(this.katasDirectory, metadata.slug);
        if (fs.existsSync(targetDir)) {
          throw new Error(`Kata with slug '${metadata.slug}' already exists`);
        }

        // Move from temp to final location
        fs.renameSync(kataDir, targetDir);

        console.log(`Successfully imported kata: ${metadata.slug}`);
      } finally {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      const fsError = new Error(`Failed to import kata from ${zipPath}: ${error}`) as FileSystemError;
      fsError.code = 'IMPORT_FAILED';
      fsError.path = zipPath;
      throw fsError;
    }
  }

  /**
   * Exports a kata to a zip file
   */
  public async exportKata(slug: string): Promise<string> {
    const kataPath = await this.getKataPath(slug);
    if (!kataPath) {
      const error = new Error(`Kata not found: ${slug}`) as FileSystemError;
      error.code = 'KATA_NOT_FOUND';
      throw error;
    }

    try {
      // Validate kata before export
      const validation = this.validateKataDirectory(kataPath);
      if (!validation.isValid) {
        throw new Error(`Cannot export invalid kata: ${validation.errors.join(', ')}`);
      }

      const zip = new AdmZip();
      
      // Add all files from the kata directory
      this.addDirectoryToZip(zip, kataPath, slug);

      // Generate output path
      const outputPath = path.join(this.katasDirectory, `${slug}.zip`);
      
      // Write zip file
      zip.writeZip(outputPath);

      console.log(`Successfully exported kata: ${slug} to ${outputPath}`);
      return outputPath;
    } catch (error) {
      const fsError = new Error(`Failed to export kata ${slug}: ${error}`) as FileSystemError;
      fsError.code = 'EXPORT_FAILED';
      fsError.path = kataPath;
      throw fsError;
    }
  }

  /**
   * Imports multiple katas from zip files
   */
  public async importMultipleKatas(zipPaths: string[]): Promise<{ success: string[], failed: { path: string, error: string }[] }> {
    const results = {
      success: [] as string[],
      failed: [] as { path: string, error: string }[]
    };

    for (const zipPath of zipPaths) {
      try {
        await this.importKata(zipPath);
        results.success.push(zipPath);
      } catch (error) {
        results.failed.push({
          path: zipPath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Exports multiple katas to zip files
   */
  public async exportMultipleKatas(slugs: string[]): Promise<{ success: string[], failed: { slug: string, error: string }[] }> {
    const results = {
      success: [] as string[],
      failed: [] as { slug: string, error: string }[]
    };

    for (const slug of slugs) {
      try {
        const outputPath = await this.exportKata(slug);
        results.success.push(outputPath);
      } catch (error) {
        results.failed.push({
          slug,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Analyzes zip structure to validate kata format
   */
  private analyzeZipStructure(zipEntries: AdmZip.IZipEntry[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required files
    const entryNames = zipEntries.map(entry => entry.entryName);
    
    // Look for meta.yaml and statement.md at any level
    const hasMetaYaml = entryNames.some(name => name.endsWith('meta.yaml') || name.endsWith('meta.yml'));
    const hasStatement = entryNames.some(name => name.endsWith('statement.md'));

    if (!hasMetaYaml) {
      errors.push('Missing meta.yaml file');
    }

    if (!hasStatement) {
      errors.push('Missing statement.md file');
    }

    // Check for reasonable structure (not too many nested levels)
    const maxDepth = Math.max(...entryNames.map(name => name.split('/').length));
    if (maxDepth > 5) {
      warnings.push('Zip structure is deeply nested, this might cause issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Finds the kata directory in extracted content
   */
  private findKataDirectory(extractedPath: string, maxDepth: number = 3): string | null {
    // Check if the extracted path itself is a kata directory
    if (this.isKataDirectory(extractedPath)) {
      return extractedPath;
    }

    // Prevent infinite recursion
    if (maxDepth <= 0) {
      return null;
    }

    // Look for kata directory in subdirectories
    try {
      const entries = fs.readdirSync(extractedPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(extractedPath, entry.name);
          if (this.isKataDirectory(subPath)) {
            return subPath;
          }
          
          // Recursively check one level deeper with reduced depth
          const deeperPath = this.findKataDirectory(subPath, maxDepth - 1);
          if (deeperPath) {
            return deeperPath;
          }
        }
      }
    } catch (error) {
      console.warn(`Error scanning directory ${extractedPath}:`, error);
    }

    return null;
  }

  /**
   * Checks if a directory contains kata files
   */
  private isKataDirectory(dirPath: string): boolean {
    try {
      const files = fs.readdirSync(dirPath);
      return files.includes('meta.yaml') || files.includes('meta.yml');
    } catch {
      return false;
    }
  }

  /**
   * Recursively adds directory contents to zip
   */
  private addDirectoryToZip(zip: AdmZip, dirPath: string, baseName: string): void {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recursively add subdirectory
        this.addDirectoryToZip(zip, filePath, baseName);
      } else {
        // Add file to zip with proper path structure
        const relativePath = path.relative(path.dirname(dirPath), filePath);
        const zipPath = relativePath.replace(/\\/g, '/'); // Ensure forward slashes for zip
        
        try {
          const fileContent = fs.readFileSync(filePath);
          zip.addFile(zipPath, fileContent);
        } catch (error) {
          console.warn(`Failed to add file ${filePath} to zip:`, error);
        }
      }
    }
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