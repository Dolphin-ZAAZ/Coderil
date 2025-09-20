# Requirements Document

## Introduction

This feature involves creating a minimal Electron desktop application for code katas that supports local execution of programming challenges and AI-powered judging for explanation tasks. The application will provide an integrated development environment with code editing, test execution, progress tracking, and automated scoring across multiple programming languages (Python, JavaScript/TypeScript, C++).

## Requirements

### Requirement 1

**User Story:** As a developer practicing coding skills, I want to load and work on code katas locally, so that I can practice programming without requiring internet connectivity for execution.

#### Acceptance Criteria

1. WHEN a user drops a valid kata folder into the application THEN the system SHALL display the kata in the selector interface
2. WHEN a user selects a kata THEN the system SHALL load the statement, starter code, and test configuration
3. WHEN the application starts THEN the system SHALL scan the /katas/ directory and populate the kata selector
4. IF a kata folder contains invalid structure THEN the system SHALL display an appropriate error message

### Requirement 2

**User Story:** As a developer, I want to write and test code in multiple programming languages, so that I can practice different language skills within the same application.

#### Acceptance Criteria

1. WHEN a user selects a Python kata THEN the system SHALL provide Monaco editor with Python syntax highlighting
2. WHEN a user selects a JavaScript/TypeScript kata THEN the system SHALL provide Monaco editor with appropriate syntax highlighting
3. WHEN a user selects a C++ kata THEN the system SHALL provide Monaco editor with C++ syntax highlighting
4. WHEN a user clicks "Run" THEN the system SHALL execute only public test cases within the configured timeout
5. WHEN a user clicks "Submit" THEN the system SHALL execute both public and hidden test cases
6. IF execution exceeds the timeout limit THEN the system SHALL terminate the process and report timeout failure

### Requirement 3

**User Story:** As a developer, I want immediate feedback on my code execution, so that I can understand what's working and what needs improvement.

#### Acceptance Criteria

1. WHEN public tests are executed THEN the system SHALL display detailed failure messages and stderr output
2. WHEN public tests pass THEN the system SHALL show success indicators for each test case
3. WHEN Submit is executed THEN the system SHALL display pass/fail status and calculated score
4. WHEN scoring is calculated THEN the system SHALL weight public tests at 30% and hidden tests at 70%
5. IF a test fails THEN the system SHALL show the specific failure reason without revealing hidden test details
6. WHEN public tests are executed THEN the user interface SHALL provide a log which prints user written logs during execution

### Requirement 4

**User Story:** As a developer working on explanation katas, I want AI-powered feedback on my explanations, so that I can improve my ability to communicate technical concepts.

#### Acceptance Criteria

1. WHEN a user submits an explanation kata THEN the system SHALL send the explanation to the configured AI model
2. WHEN the AI processes an explanation THEN the system SHALL return structured JSON with scores, feedback, and pass status
3. WHEN AI scoring is complete THEN the system SHALL enforce rubric-based minimum thresholds for passing
4. IF the AI response is malformed THEN the system SHALL allow the user to retry submission
5. WHEN an explanation fails THEN the system SHALL NOT reveal the exemplar answer and offer a retry

### Requirement 4.1

**User Story:** As a developer working on template katas, I want AI-powered feedback on my template implementations, so that I can improve my ability to create proper project structures and boilerplate code.

#### Acceptance Criteria

1. WHEN a user submits a template kata THEN the system SHALL send the template content to the configured AI model
2. WHEN the AI processes a template THEN the system SHALL evaluate structure, completeness, and best practices
3. WHEN AI scoring is complete THEN the system SHALL provide feedback on missing components, incorrect patterns, and improvements
4. IF the template is "close enough" based on AI judgment THEN the system SHALL mark it as passed
5. WHEN a template fails THEN the system SHALL provide specific guidance on what needs to be improved

### Requirement 5

**User Story:** As a developer, I want my progress and code to be automatically saved, so that I don't lose work and can track my improvement over time.

#### Acceptance Criteria

1. WHEN a user types in the editor THEN the system SHALL autosave the code to LocalStorage
2. WHEN a user submits a kata THEN the system SHALL record the attempt in SQLite database
3. WHEN the application restarts THEN the system SHALL restore the user's last code for each kata
4. WHEN viewing kata history THEN the system SHALL display best score, last status, and attempt count
5. IF database operations fail THEN the system SHALL gracefully handle errors and notify the user

### Requirement 6

**User Story:** As a developer, I want to filter and organize katas, so that I can easily find appropriate challenges for my skill level and interests.

#### Acceptance Criteria

1. WHEN the kata selector loads THEN the system SHALL display filterable options by difficulty, language, and tags
2. WHEN a user applies filters THEN the system SHALL update the kata list in real-time
3. WHEN kata metadata is loaded THEN the system SHALL parse and display title, difficulty, and tags from meta.yaml
4. IF meta.yaml is missing or invalid THEN the system SHALL use fallback values and log warnings

### Requirement 7

**User Story:** As a kata creator, I want to easily scaffold new kata structures, so that I can quickly create new challenges with proper formatting.

#### Acceptance Criteria

1. WHEN the CLI command "new-kata" is executed THEN the system SHALL create a complete kata folder structure
2. WHEN scaffolding is complete THEN the system SHALL generate statement.md, meta.yaml, starter files, and test files
3. WHEN language is specified THEN the system SHALL create appropriate starter and test files for that language
4. IF the target directory already exists THEN the system SHALL prompt for confirmation before overwriting

### Requirement 8

**User Story:** As a developer, I want to import and export katas, so that I can share challenges and expand my kata collection.

#### Acceptance Criteria

1. WHEN a user exports a kata THEN the system SHALL create a zip file containing all kata files
2. WHEN a user imports a kata zip THEN the system SHALL validate the structure and extract to /katas/
3. WHEN importing fails validation THEN the system SHALL display specific error messages about missing components
4. WHEN import is successful THEN the system SHALL refresh the kata selector to include the new kata

### Requirement 9

**User Story:** As a user, I want the application to work reliably across different system configurations, so that I can use it regardless of my development environment setup.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL check for Python, Node.js, and C++ compiler availability
2. IF required runtimes are missing THEN the system SHALL display informative warnings with installation guidance
3. WHEN packaging the application THEN the system SHALL include electron-builder configurations for cross-platform distribution
4. WHEN runtime errors occur THEN the system SHALL provide clear error messages and recovery suggestions