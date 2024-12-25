# Obsidian Browser Favorites Plugin

A plugin for [Obsidian](https://obsidian.md) that allows you to import your browser bookmarks into your vault as organized Markdown notes.

## Features

- Import bookmarks from any browser's HTML bookmarks export
- Automatically categorizes bookmarks into separate notes
- Maintains clickable links with original titles
- Customizable output folder location
- Simple and intuitive user interface

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
1. Open Chrome's Bookmark Manager (⌘/Ctrl + Shift + B)
2. Click the three dots menu (⋮)
3. Select "Export bookmarks"

#### Firefox
1. Click the Library button (☰)
2. Click "Bookmarks" → "Show All Bookmarks"
3. Click "Import and Backup" → "Export Bookmarks to HTML"

#### Safari
1. Click File → "Export Bookmarks"

### Importing into Obsidian

1. Click the browser icon in the ribbon (sidebar) or use the command palette to run "Import Browser Bookmarks"
2. Paste the content of your exported HTML file into the modal
3. Click Import

Your bookmarks will be automatically categorized and saved as Markdown files in the specified output folder.

## Configuration

You can configure the following settings:

- **Output folder**: The folder where your bookmark notes will be created (default: "Browser Favorites")

## Categories

The plugin automatically categorizes bookmarks into the following default categories:

- News: Links containing "news" in the title
- Reference: Links containing "wiki" in the title
- Blogs: Links containing "blog" in the title
- General: All other links

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

### 1.0.0 (Initial Release)
- Initial release with basic bookmark import functionality
- Automatic categorization
- Custom output folder support
- Browser bookmark HTML import support

## Version Control
- npm version patch  # For 1.0.0 -> 1.0.1
- npm version minor  # For 1.0.0 -> 1.1.0
- npm version major  # For 1.0.0 -> 2.0.0
or edit package.json and
```
npm run version-sync
npm run build
```
## Credits

Developed by [Your Name]

## Acknowledgments

- The Obsidian team for creating an amazing platform
- The Obsidian community for their support and feedback