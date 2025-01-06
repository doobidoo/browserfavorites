# Contributing to Browser Favorites Plugin

[previous content remains the same until Release Process section]

## Release Process

### Automated Release

The easiest way to create a new release is to use the automated release script:

1. Ensure your changes are committed and pushed
2. Run `npm version patch|minor|major` to bump the version
3. Run `npm run release`

This will:
- Build the project
- Create a git tag
- Push the tag to GitHub
- Create a GitHub release with the required files:
  - manifest.json
  - main.js
  - styles.css

### Manual Release (if needed)

If you need to create a release manually:

1. Update version numbers in:
   - manifest.json
   - package.json
   - versions.json
2. Update CHANGELOG.md
3. Run `npm run build`
4. Create a new GitHub release
5. Upload the required files:
   - manifest.json
   - main.js
   - styles.css

[rest of the content remains the same]