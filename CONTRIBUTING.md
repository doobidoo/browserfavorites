# Contributing to Browser Favorites Plugin

First off, thank you for considering contributing to the Browser Favorites Plugin! It's people like you that help make this plugin better for everyone.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct: be respectful, constructive, and collaborative.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (e.g., the HTML bookmark file you're trying to import)
- **Describe the behavior you observed and what you expected to see**
- **Include screenshots if possible**
- **Include your Obsidian version and plugin version**
- **Note if you're using any other plugins that might interact with this one**

### Suggesting Enhancements

If you have an idea for how to improve the plugin:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Explain why this enhancement would be useful to most users**
- **List some examples of how it would work in practice**

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Follow the TypeScript styleguide
- Include screenshots in your pull request whenever possible
- End all files with a newline
- Avoid platform-dependent code

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/browserfavorites.git`
3. Create a branch for your changes: `git checkout -b your-branch-name`
4. Install dependencies: `npm install`
5. Start development server: `npm run dev`

### Development Environment

1. Make sure you have Node.js (v16 or higher) installed
2. Install TypeScript globally: `npm install -g typescript`
3. For testing, you can symlink your development folder to your Obsidian plugins folder:
   ```bash
   ln -s /path/to/your/development/folder /path/to/obsidian/vault/.obsidian/plugins/browserfavorites
   ```

### Project Structure

```
browserfavorites/
├── src/                    # Source files
│   ├── main.ts            # Main plugin file
│   ├── ui/                # UI components
│   ├── models/            # Type definitions and interfaces
│   └── utils/             # Utility functions
├── styles.css             # Plugin styles
├── manifest.json          # Plugin manifest
└── package.json           # Package configuration
```

## Testing

Before submitting your changes:

1. Ensure all TypeScript files compile without errors: `npm run build`
2. Test your changes with different bookmark formats (Chrome, Firefox, Safari)
3. Test with various folder structures and settings configurations
4. Verify that accessibility checking works properly
5. Check that the deduplication feature works as expected

## Style Guide

### TypeScript

- Use TypeScript's strict mode
- Use interfaces for object types
- Use enums for fixed sets of values
- Document all public methods with JSDoc comments
- Use meaningful variable names

### CSS

- Use Obsidian's CSS variables for theming
- Follow BEM naming conventions
- Keep selectors as specific as possible
- Test with both light and dark themes

## Git Commit Guidelines

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Example commit messages:
```
Add bookmark category auto-detection
Fix accessibility checker timeout issue
Update README with new features
```

## Release Process

1. Update version numbers in:
   - manifest.json
   - package.json
   - versions.json
2. Update CHANGELOG.md
3. Create a new GitHub release
4. Include compiled main.js, styles.css, and manifest.json in the release

## Questions?

Feel free to open an issue with your question or reach out to the maintainers directly.

Thank you for contributing to the Browser Favorites Plugin!