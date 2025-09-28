# CLI Scaffolding Tool

The Code Kata Electron App includes a CLI scaffolding tool for quickly creating new kata structures with proper templates and configurations.

## Usage

### Using npm script (recommended)
```bash
npm run new-kata <kata-name> [language] [type] [difficulty]
```

### Direct execution
```bash
node scripts/new-kata.js new-kata <kata-name> [options]
```

## Parameters

### Required
- `<kata-name>`: The name of the kata (will be used as directory name)

### Optional Positional Arguments (npm script)
- `[language]`: Programming language (`py`, `js`, `ts`, `cpp`) - default: `py`
- `[type]`: Kata type (`code`, `explain`, `template`) - default: `code`
- `[difficulty]`: Difficulty level (`easy`, `medium`, `hard`) - default: `easy`

### Optional Named Arguments (direct execution)
- `--language, -l <lang>`: Programming language
- `--type, -t <type>`: Kata type
- `--difficulty, -d <diff>`: Difficulty level
- `--title <title>`: Custom title (default: derived from kata-name)

## Examples

### Basic code kata (Python)
```bash
npm run new-kata my-first-kata
```

### JavaScript kata with medium difficulty
```bash
npm run new-kata array-manipulation js code medium
```

### TypeScript explanation kata
```bash
npm run new-kata explain-algorithms ts explain hard
```

### C++ template kata
```bash
npm run new-kata cpp-project-template cpp template easy
```

### Using named arguments
```bash
node scripts/new-kata.js new-kata binary-search --language cpp --type code --difficulty medium --title "Binary Search Algorithm"
```

## Generated Files

### Code Katas
For code katas, the following files are generated:

- `meta.yaml` - Kata metadata and configuration
- `statement.md` - Problem description and requirements
- `entry.[ext]` - Starter code file
- `solution.[ext]` - Reference solution implementation
- `tests.[ext]` - Public test cases
- `hidden_tests.[ext]` - Hidden test cases (copy of tests for initial setup)

### Explanation Katas
For explanation katas, the following files are generated:

- `meta.yaml` - Kata metadata and configuration
- `statement.md` - Explanation task description
- `entry.[ext]` - Placeholder entry file
- `solution.[ext]` - Reference solution with example implementation
- `explanation.md` - Template for writing explanations
- `rubric.yaml` - AI judging criteria and thresholds

### Template Katas
For template katas, the following files are generated:

- `meta.yaml` - Kata metadata and configuration
- `statement.md` - Template creation task description
- `entry.[ext]` - Placeholder entry file
- `solution.[ext]` - Reference solution showing proper template structure
- `template/` - Directory for template files
- `template/README.md` - Template documentation
- `rubric.yaml` - AI judging criteria and thresholds

## Language-Specific Templates

### Python (`py`)
- Entry function: `def solve(param):`
- Test framework: Assert-based with descriptive error messages
- Import structure: Relative imports from entry module

### JavaScript (`js`)
- Entry function: `function solve(param) {}`
- Module system: CommonJS (`module.exports`, `require`)
- Test framework: Custom test runner with `runPublic`/`runHidden` functions

### TypeScript (`ts`)
- Entry function: `export function solve(param: any): any {}`
- Module system: ES modules (`export`, `import`)
- Test framework: TypeScript-compatible test runner
- Type annotations: Basic typing with `any` for flexibility

### C++ (`cpp`)
- Entry function: `auto solve(auto param)`
- Headers: Common includes (`iostream`, `vector`, `string`)
- Test framework: Assert-based with main function
- Modern C++: Uses `auto` for type deduction

## File Structure

After running the CLI tool, your kata directory will look like this:

```
katas/
└── your-kata-name/
    ├── meta.yaml           # Kata configuration
    ├── statement.md        # Problem description
    ├── entry.[ext]         # Starter code
    ├── solution.[ext]      # Reference solution
    ├── tests.[ext]         # Public tests (code katas only)
    ├── hidden_tests.[ext]  # Hidden tests (code katas only)
    ├── explanation.md      # Explanation template (explain katas only)
    ├── template/           # Template directory (template katas only)
    │   └── README.md       # Template documentation
    └── rubric.yaml         # AI judging criteria (explain/template katas only)
```

## Error Handling

The CLI tool includes comprehensive error handling:

- **Invalid language**: Shows valid options (`py`, `js`, `ts`, `cpp`)
- **Invalid type**: Shows valid options (`code`, `explain`, `template`)
- **Invalid difficulty**: Shows valid options (`easy`, `medium`, `hard`)
- **Missing kata name**: Shows usage instructions
- **Directory exists**: Prevents overwriting existing katas
- **File system errors**: Cleans up partially created directories on failure

## Integration with Application

The generated katas are immediately available in the Code Kata Electron App:

1. The app scans the `katas/` directory on startup
2. New katas appear in the kata selector
3. All metadata is parsed from `meta.yaml`
4. The app respects the language, type, and difficulty settings

## Best Practices

1. **Naming**: Use kebab-case for kata names (e.g., `two-sum-problem`)
2. **Descriptions**: Edit the generated `statement.md` to provide clear problem descriptions
3. **Solutions**: Update the `solution.[ext]` file with the correct implementation
4. **Tests**: Update the test files with actual test cases and expected outputs
5. **Metadata**: Adjust tags in `meta.yaml` to help with filtering and organization
6. **Templates**: For template katas, create a complete, usable project structure

## Troubleshooting

### Permission Errors
Ensure you have write permissions to the `katas/` directory.

### Node.js Version
The CLI tool requires Node.js 14+ for ES modules support.

### Path Issues
Run the command from the project root directory where `package.json` is located.

### Validation Errors
Check that your kata name doesn't contain special characters or spaces.