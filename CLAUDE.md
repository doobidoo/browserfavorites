# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Development**: `npm run dev` - Starts esbuild in watch mode for development
- **Build**: `npm run build` - Runs version sync, TypeScript check, and production build
- **Release**: `npm run release` - Builds and creates a release package
- **Version Sync**: `npm run version-sync` - Synchronizes version across files

## Architecture

This is an Obsidian plugin that imports browser bookmarks and manages them as structured Markdown files.

### Core Components

**Main Plugin (`src/main.ts`)**: 
- Extends Obsidian's Plugin class
- Handles bookmark import, deduplication, and accessibility checking
- Manages three main commands: import, cleanup duplicates, and check accessibility
- Uses AbortController for cancellable operations

**Data Models (`src/models/types.ts`)**:
- `Bookmark` interface with title, url, tags, dates, description, and categorization
- `BrowserFavoritesSettings` for plugin configuration
- `BOOKMARK_TABLE_HEADERS` provides consistent table formatting

**Bookmark Processing (`src/utils/bookmarkUtils.ts`)**:
- `deduplicateBookmarkArray()`: Removes duplicate URLs, keeps newest, merges tags
- `formatBookmarkLine()`: Formats bookmark as Markdown table row
- `categorize()`: Assigns category and subcategory to bookmarks

**UI Components (`src/ui/`)**:
- `FileUploadModal`: Handles HTML file upload for bookmark import
- `SettingTab`: Plugin settings interface

### Key Features

- **Import Flow**: HTML → DOM parsing → categorization → deduplication → Markdown table creation
- **Accessibility Checking**: Fetches URLs to verify accessibility and extract metadata
- **Duplicate Cleanup**: Processes existing files to remove duplicates across categories
- **Progress Tracking**: Long operations show progress with cancel capability
- **File Organization**: Bookmarks organized by category in separate `.md` files with subcategory sections

### Build System

- Uses esbuild for bundling (`esbuild.config.mjs`)
- TypeScript compilation with strict null checks
- External dependencies: obsidian, electron, codemirror modules
- Production builds exclude sourcemaps and enable tree shaking

## Plugin Submission Status

**Status**: ✅ **SUBMITTED TO OBSIDIAN COMMUNITY**
- **Submission Date**: January 7, 2025
- **Pull Request**: https://github.com/obsidianmd/obsidian-releases/pull/7003
- **Plugin ID**: `browserfavorites`
- **Current Version**: 3.1.10

### Submission Details
- Plugin entry added to community-plugins.json
- All requirements met (manifest.json, main.js, styles.css, README.md)
- GitHub release v3.1.10 available with required files
- Comprehensive documentation and features implemented
- Awaiting review from Obsidian team

### Post-Approval Actions Needed
- Monitor PR for feedback and respond promptly
- Once merged, plugin will be available in Community Plugins within 24-48 hours
- Consider announcing in Obsidian forums and Discord #updates channel

## Obsidian Plugin Submission Guidelines

### Critical Requirements for PR Template
**MUST follow the EXACT template** from `.github/PULL_REQUEST_TEMPLATE/plugin.md`:
- Header MUST be: `# I am submitting a new Community Plugin`
- Use exact checkbox formatting and section headers
- Bot validation is very strict about template compliance

### Release Tag Requirements
- GitHub release tag MUST match manifest.json version EXACTLY
- **NO `v` prefix**: Use `3.1.10`, NOT `v3.1.10`
- Release must contain individual files (not just source.zip):
  - `main.js` (required)
  - `manifest.json` (required) 
  - `styles.css` (optional but recommended)

### Common Validation Failures
1. **Wrong PR template format** - Bot expects exact header/checkbox format
2. **Incorrect release tag** - Must be exact version without `v` prefix
3. **Missing files in release** - Files must be individual assets, not just in source archives
4. **ID mismatch** - Plugin ID in manifest.json must match community-plugins.json entry

### Validation Process
- GitHub Actions automatically validates on PR updates
- Usually takes 1-5 minutes to complete
- Validation reruns automatically when PR is updated
- Look for green checkmark and "Ready for review" label

### Template Location
- Official template: `https://github.com/obsidianmd/obsidian-releases/blob/master/.github/PULL_REQUEST_TEMPLATE/plugin.md`
- Must copy exact formatting including comments and checkboxes

## Security Updates

### Fixed Vulnerabilities (January 7, 2025)
- **esbuild CORS vulnerability** (GHSA-67mh-4wv8-2f99): Updated from 0.17.3 to 0.25.5
  - Medium severity: Development server CORS misconfiguration allowed arbitrary requests
  - Fixed by updating to esbuild 0.25.0+ which properly configures CORS headers
- **brace-expansion ReDoS**: Fixed regex denial of service vulnerability
- All npm audit issues resolved (0 vulnerabilities remaining)

### Security Maintenance
- Run `npm audit` regularly to check for new vulnerabilities
- Update dependencies promptly when security fixes are available
- Monitor GitHub Dependabot alerts and resolve them quickly