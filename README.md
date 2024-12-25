# Obsidian Browser Favorites Plugin

A plugin for [Obsidian](https://obsidian.md) that allows you to import your browser bookmarks into your vault as organized Markdown notes, with advanced management features.

## Features

- Import bookmarks from any browser's HTML bookmarks export
- Automatically categorizes bookmarks into separate notes with smart subcategories
- Maintains clickable links with original titles
- Customizable output folder location
- Automatic deduplication of bookmarks
- Bookmark accessibility checking
- Smart tag extraction from titles and URLs
- Metadata enrichment (descriptions and tags from websites)
- Progress tracking for long operations
- Selective file processing

## Installation

### From Obsidian Community Plugins

1. Open Settings in Obsidian
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Browser Favorites"
4. Install the plugin
5. Enable the plugin in the Installed Plugins tab

### Manual Installation

1. Download the latest release from the Releases page
2. Extract the files into your vault's `.obsidian/plugins/browser-favorites` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Usage

### Exporting Bookmarks from Your Browser

#### Chrome
1. Open Chrome's Bookmark Manager (⌘/Ctrl + Shift + O)
2. Click the three dots menu (⋮)
3. Select "Export bookmarks"

#### Firefox
1. Click the Library button (☰)
2. Click "Bookmarks" → "Show All Bookmarks"
3. Click "Import and Backup" → "Export Bookmarks to HTML"

#### Edge
1. Click Settings
2. Navigate to Favorites
3. Click the three dots (⋮)
4. Select "Export favorites"

### Importing into Obsidian

You can import bookmarks in two ways:

1. Click the bookmark icon in the ribbon (left sidebar)
2. Use the Command Palette (Ctrl/Cmd + P) and
   - Run "Import Browser Bookmarks"
   - Select your exported HTML file using the file picker
   - Click Import

Your bookmarks will be automatically:

Your bookmarks will be automatically:
- Deduplicated to remove any duplicates
- Categorized into logical groups
- Enhanced with metadata when possible
- Saved as organized Markdown files

### Managing Bookmarks

#### Checking Bookmark Accessibility
1. Use the command palette to run "Check Bookmarks Accessibility"
2. Choose between checking all files or select specific ones
3. Monitor the progress as the plugin checks each bookmark
4. Results will show ✅ for accessible and ❌ for inaccessible links

#### Cleaning Up Duplicates
1. Use the command palette to run "Cleanup Duplicate Bookmarks"
2. Choose between processing all files or select specific ones
3. The plugin will automatically:
   - Identify duplicate URLs
   - Keep the newest version of each bookmark
   - Combine tags from all duplicates
   - Update the files accordingly

## Configuration

You can configure the following settings:

- **Output folder**: The folder where your bookmark notes will be created (default: "Browser Favorites")
- **Check accessibility**: Enable/disable automatic bookmark accessibility checking

## Categories

The plugin automatically categorizes bookmarks into the following categories with smart subcategories:

- News (Technology, Business, Sports, Politics)
- Reference (with Wikipedia category detection)
- Blogs (Technology, Business, Sports, Politics)
- Social Media (Social, Media)
- Travel (Food, Travel)
- Entertainment (Movies, Music, Gaming)
- Health & Wellness (Fitness, Medicine, Nutrition)
- Education (Tutorials, Courses)
- General (for uncategorized bookmarks)

## Development

This plugin is open source and welcomes contributions. To set up for development:

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to start compilation in watch mode

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

If you encounter any issues or have feature requests, please:

1. Check the existing issues in the GitHub repository
2. If you can't find a relevant issue, create a new one with:
   - A clear description of the problem or request
   - Steps to reproduce (for bugs)
   - Your Obsidian and plugin versions

## Changelog

### 3.1.6 (Current)
- Added selective file processing for accessibility checks
- Added progress tracking for long operations
- Improved duplicate detection and cleanup
- Enhanced metadata extraction
- Added smart tag extraction
- Added subcategory support

[Previous versions changelog...]

## Disclosures

Network use: The plugin makes use of the network to:
- Check bookmark accessibility
- Fetch metadata from bookmarked sites (descriptions, tags)
- Read meta information for enhanced categorization

## Credits

Developed by Heinrich Krupp

## Acknowledgments

- The Obsidian team for creating an amazing platform
- The Obsidian community for their support and feedback