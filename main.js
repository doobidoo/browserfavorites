/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => BrowserFavoritesPlugin
});
module.exports = __toCommonJS(main_exports);

const obsidian = require('obsidian');
const path = require('path');

const DEFAULT_SETTINGS = {
    outputFolderPath: 'Browser Favorites'
};

class FileUploadModal extends obsidian.Modal {
    constructor(app, onFileUpload) {
        super(app);
        this.onFileUpload = onFileUpload;
    }

    onOpen() {
        const {contentEl, titleEl} = this;

        titleEl.setText('Import Browser Bookmarks');
        
        const instructions = contentEl.createEl("div");
        instructions.createEl("p", {
            text: "How to export your bookmarks:",
            cls: "browser-favorites-header"
        });
        
        const browserInstructions = instructions.createEl("div", {
            cls: "browser-favorites-instructions"
        });
        
        browserInstructions.createEl("p", {
            text: "Chrome: Bookmarks Manager (Ctrl+Shift+O) → ⋮ → Export bookmarks"
        });
        browserInstructions.createEl("p", {
            text: "Firefox: Bookmarks → Manage Bookmarks → Import and Backup → Export Bookmarks to HTML"
        });
        browserInstructions.createEl("p", {
            text: "Edge: Settings → Favorites → ⋮ → Export favorites"
        });

        const fileInputContainer = contentEl.createEl("div", {
            cls: "browser-favorites-file-input"
        });

        const fileInputButton = fileInputContainer.createEl("button", {
            text: "Select Bookmarks HTML File",
            cls: "browser-favorites-file-button"
        });

        const fileInput = fileInputContainer.createEl("input", {
            attr: {
                type: "file",
                accept: ".html,.htm",
                style: "display: none;"
            }
        });

        const fileNameDisplay = fileInputContainer.createEl("div", {
            cls: "browser-favorites-filename"
        });

        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if (file) {
                fileNameDisplay.setText(file.name);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    if (typeof content === 'string') {
                        this.onFileUpload(content);
                        this.close();
                    } else {
                        new obsidian.Notice("Unable to read file content. Please make sure it's a text file.");
                    }
                };
                reader.onerror = (error) => {
                    console.error('Error reading file:', error);
                    new obsidian.Notice("Error reading file. Please try again.");
                };
                reader.readAsText(file);
            }
        });

        fileInputButton.addEventListener("click", () => {
            fileInput.click();
        });

        new obsidian.Setting(contentEl)
            .addButton(button => {
                button.setButtonText("Cancel")
                    .onClick(() => {
                        this.close();
                    });
            });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class BrowserFavoritesPlugin extends obsidian.Plugin {
    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('browser', 'Browser Favorites', () => {
            new obsidian.Notice('This plugin cannot directly access browser bookmarks due to security restrictions. Please export your bookmarks as HTML and use the import functionality.');
        });

        this.addSettingTab(new BrowserFavoritesSettingTab(this.app, this));

        this.addCommand({
            id: 'import-browser-bookmarks',
            name: 'Import Browser Bookmarks',
            callback: async () => {
                new FileUploadModal(this.app, (content) => {
                    this.importBookmarks(content);
                }).open();
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    categorize(title, href) {
      const lowerTitle = title.toLowerCase();
      const lowerUrl = href.toLowerCase();
      
      // Default category and subcategory
      let category = 'General';
      let subcategory = '';
  
      // Helper function to check keywords
      const matchesKeywords = (text, keywords) => keywords.some(keyword => text.includes(keyword));
  
      // Define category rules
      const categoryRules = [
          {
              category: 'News',
              keywords: ['news'],
              subcategories: {
                  Technology: ['tech'],
                  Business: ['business'],
                  Sports: ['sports', 'sport'],
                  Politics: ['politics', 'government']
              }
          },
          {
              category: 'Reference',
              keywords: ['wiki', 'wikipedia'],
              extractSubcategory: (url) => {
                  const match = url.match(/wikipedia\.org\/wiki\/Category:(.+)/);
                  return match ? match[1].replace(/_/g, ' ').split('/')[0] : '';
              }
          },
          {
              category: 'Blogs',
              keywords: ['blog'],
              subcategories: {
                  Technology: ['tech'],
                  Food: ['food', 'recipes'],
                  Travel: ['travel', 'tourism']
              }
          },
          {
              category: 'Entertainment',
              keywords: ['movies', 'music', 'games'],
              subcategories: {
                  Movies: ['movies', 'films', 'cinema'],
                  Music: ['music', 'songs'],
                  Gaming: ['games', 'gaming']
              }
          },
          {
              category: 'Health & Wellness',
              keywords: ['health', 'wellness', 'fitness', 'medicine'],
              subcategories: {
                  Fitness: ['fitness', 'exercise', 'workout'],
                  Medicine: ['medicine', 'medical'],
                  Nutrition: ['nutrition', 'diet']
              }
          },
          {
              category: 'Education',
              keywords: ['learn', 'education', 'tutorials'],
              subcategories: {
                  Tutorials: ['tutorial', 'how-to'],
                  Courses: ['course', 'class']
              }
          }
          // Add more categories and subcategories as needed
      ];
  
      // Check categories
      for (const rule of categoryRules) {
          if (matchesKeywords(lowerTitle, rule.keywords) || matchesKeywords(lowerUrl, rule.keywords)) {
              category = rule.category;
  
              // Check subcategories
              if (rule.subcategories) {
                  for (const [subcat, subcatKeywords] of Object.entries(rule.subcategories)) {
                      if (matchesKeywords(lowerTitle, subcatKeywords) || matchesKeywords(lowerUrl, subcatKeywords)) {
                          subcategory = subcat;
                          break;
                      }
                  }
              }
  
              // Extract subcategory if defined
              if (!subcategory && rule.extractSubcategory) {
                  subcategory = rule.extractSubcategory(lowerUrl);
              }
  
              break; // Stop checking once a category is matched
          }
      }
  
      return { category, subcategory };
    }
  
    extractTags(title, url) {
        const tags = new Set();

        // Extract domain name as a tag
        if (url) {
            try {
                const urlParts = new URL(url).hostname.split('.');
                if (urlParts.length > 1) {
                    tags.add(`#${urlParts[urlParts.length - 2].toLowerCase()}`);
                }
            } catch (e) {
                console.error('Error parsing URL:', e);
            }
        }

        // List of common keywords to extract as tags
        const commonKeywords = [
            'tutorial', 'guide', 'review', 'documentation', 'api', 'tool', 
            'news', 'update', 'tips', 'tricks', 'how-to', 'reference', 
            'blog', 'opinion', 'article', 'resource', 'project', 'code'
        ];

        // Add matching keywords from the title
        if (title) {
            commonKeywords.forEach(keyword => {
                if (title.toLowerCase().includes(keyword)) {
                    tags.add(`#${keyword}`);
                }
            });
        }

        return Array.from(tags);
    }


    async importBookmarks(htmlContent) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const links = doc.querySelectorAll('a');
            
            if (links.length === 0) {
                new obsidian.Notice('No bookmarks found in the file.');
                return;
            }

            const bookmarks = {};
            const stats = {
                total: 0,
                new: 0,
                existing: 0
            };

            for (const link of links) {
                const href = link.getAttribute('href');
                if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                    stats.total++;
                    const title = link.textContent?.trim() || 'Untitled';
                    const { category, subcategory } = this.categorize(title, href);
                    const tags = this.extractTags(title, href);
                    const addDate = link.getAttribute('add_date') || '';
                    const lastModified = link.getAttribute('last_modified') || '';
                    
                    if (!bookmarks[category]) {
                        bookmarks[category] = {};
                    }
                    if (!bookmarks[category][subcategory || 'General']) {
                        bookmarks[category][subcategory || 'General'] = new Set();
                    }
                    
                    bookmarks[category][subcategory || 'General'].add({
                        title,
                        url: href,
                        tags,
                        addDate: addDate ? new Date(parseInt(addDate) * 1000).toISOString().split('T')[0] : '',
                        lastModified: lastModified ? new Date(parseInt(lastModified) * 1000).toISOString().split('T')[0] : '',
                        description: link.getAttribute('description') || ''
                    });
                }
            }

            if (stats.total === 0) {
                new obsidian.Notice('No valid bookmarks found.');
                return;
            }

            for (const category in bookmarks) {
                for (const subcategory in bookmarks[category]) {
                    const existingUrls = await this.readExistingBookmarks(category, subcategory);
                    const newBookmarks = Array.from(bookmarks[category][subcategory])
                        .filter(bookmark => !existingUrls.has(bookmark.url))
                        .sort((a, b) => a.title.localeCompare(b.title));
                    
                    stats.new += newBookmarks.length;
                    stats.existing += bookmarks[category][subcategory].size - newBookmarks.length;
                    
                    if (newBookmarks.length > 0) {
                        await this.appendBookmarks(category, subcategory, newBookmarks);
                    }
                }
            }

            new obsidian.Notice(
                `Import complete!\nTotal: ${stats.total}\nNew: ${stats.new}\nExisting: ${stats.existing}`
            );
        } catch (error) {
            console.error('Error processing bookmarks:', error);
            new obsidian.Notice('Error processing bookmarks. Check console for details.');
        }
    }

    async readExistingBookmarks(category, subcategory) {
        const outputFolderPath = obsidian.normalizePath(this.settings.outputFolderPath);
        const fileName = obsidian.normalizePath(path.join(outputFolderPath, `${category}.md`));
        const file = this.app.vault.getAbstractFileByPath(fileName);
        
        if (!file) return new Set();

        const content = await this.app.vault.read(file);
        const urlRegex = /\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g;
        const existingUrls = new Set();
        
        let match;
        while ((match = urlRegex.exec(content)) !== null) {
            existingUrls.add(match[2]);
        }
        
        return existingUrls;
    }

    async appendBookmarks(category, subcategory, newBookmarks) {
        const outputFolderPath = obsidian.normalizePath(this.settings.outputFolderPath);

        if (!this.app.vault.getAbstractFileByPath(outputFolderPath)) {
            await this.app.vault.createFolder(outputFolderPath);
        }

        const fileName = obsidian.normalizePath(path.join(outputFolderPath, `${category}.md`));
        const file = this.app.vault.getAbstractFileByPath(fileName);
        
        let content = '';
        let existingContent = '';
        
        if (file) {
            existingContent = await this.app.vault.read(file);
            if (!existingContent.includes(`## ${subcategory}`)) {
                content = existingContent + `\n\n## ${subcategory}\n\n`;
            } else {
                const sections = existingContent.split(/(?=## )/);
                content = sections.map(section => {
                    if (section.startsWith(`## ${subcategory}`)) {
                        return section + '\n';
                    }
                    return section;
                }).join('');
            }
        } else {
            content = `# ${category} Bookmarks\n\n## ${subcategory}\n\n`;
        }

        newBookmarks.forEach(bookmark => {
            let bookmarkEntry = `- [${bookmark.title}](${bookmark.url})`;
            
            const metadata = [];
            if (bookmark.tags.length > 0) {
                metadata.push(`Tags: ${bookmark.tags.join(', ')}`);
            }
            if (bookmark.addDate) {
                metadata.push(`Added: ${bookmark.addDate}`);
            }
            if (bookmark.description) {
                metadata.push(`Note: ${bookmark.description}`);
            }
            
            if (metadata.length > 0) {
                bookmarkEntry += `\n  - ${metadata.join(' | ')}`;
            }
            
            content += bookmarkEntry + '\n';
        });

        if (file) {
            await this.app.vault.modify(file, content);
        } else {
            await this.app.vault.create(fileName, content);
        }
    }
}

class BrowserFavoritesSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: 'Browser Favorites Settings'});
        
        new obsidian.Setting(containerEl)
            .setName('Output folder')
            .setDesc('Where to store the imported bookmarks')
            .addText(text => text
                .setPlaceholder('Browser Favorites')
                .setValue(this.plugin.settings.outputFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.outputFolderPath = value;
                    await this.plugin.saveSettings();
                }));
    }
}