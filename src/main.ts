import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, normalizePath } from 'obsidian';
import * as path from 'path';

interface BrowserFavoritesSettings {
    outputFolderPath: string;
    checkAccessibility: boolean;
}

const DEFAULT_SETTINGS: BrowserFavoritesSettings = {
    outputFolderPath: 'Browser Favorites',
    checkAccessibility: true
}

interface Bookmark {
    title: string;
    url: string;
    tags: string[];
    addDate: string;
    lastModified: string;
    description: string;
}

interface CategoryResult {
    category: string;
    subcategory: string;
}

class FileUploadModal extends Modal {
    onFileUpload: (content: string) => void;

    constructor(app: App, onFileUpload: (content: string) => void) {
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
            const file = fileInput.files?.[0];
            if (file) {
                fileNameDisplay.setText(file.name);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result;
                    if (typeof content === 'string') {
                        this.onFileUpload(content);
                        this.close();
                    } else {
                        new Notice("Unable to read file content. Please make sure it's a text file.");
                    }
                };
                reader.onerror = (error) => {
                    console.error('Error reading file:', error);
                    new Notice("Error reading file. Please try again.");
                };
                reader.readAsText(file);
            }
        });

        fileInputButton.addEventListener("click", () => {
            fileInput.click();
        });

        new Setting(contentEl)
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

export default class BrowserFavoritesPlugin extends Plugin {
    settings: BrowserFavoritesSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('browser', 'Browser Favorites', () => {
            new Notice('This plugin cannot directly access browser bookmarks due to security restrictions. Please export your bookmarks as HTML and use the import functionality.');
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

        // New accessibility check command
		this.addCommand({
			id: 'check-bookmarks-accessibility',
			name: 'Check Bookmarks Accessibility',
			callback: async () => {
				if (!this.settings.checkAccessibility) {
					new Notice('Bookmark accessibility checking is disabled. Enable it in settings first.');
					return;
				}
				new Notice('Starting bookmark accessibility check...');
				await this.checkBookmarksAccessibility();
			}
		});
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

	async checkBookmarksAccessibility() {
		if (!this.settings.checkAccessibility) return;
		
		const outputFolderPath = normalizePath(this.settings.outputFolderPath);
		const files = this.app.vault.getFiles().filter(file => 
			file.path.startsWith(outputFolderPath) && file.extension === 'md'
		);
	
		let checkedCount = 0;
		const batchSize = 5;
		const delay = 1000;
		const results = {
			accessible: 0,
			inaccessible: 0,
			errors: [] as { url: string; error: string }[]
		};
	
		for (const file of files) {
			const content = await this.app.vault.read(file);
			let newContent = content;
			const lines = content.split('\n');
			let isInTable = false;
			let tableStartIndex = -1;
			let modifiedLines = [...lines];
	
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				
				if (line.startsWith('| Title |')) {
					isInTable = true;
					tableStartIndex = i;
					// Update header if needed
					if (!line.includes('Last Check') || !line.includes('Status')) {
						modifiedLines[i] = `| Title | URL | Tags | Added | Description | Last Check | Status |`;
						modifiedLines[i + 1] = `|---------|-----|------|--------|-------------|------------|---------|`;
					}
					continue;
				}
	
				if (isInTable && line.startsWith('|') && !line.startsWith('|--')) {
					const urlMatch = line.match(/\[🔗\]\((https?:\/\/[^\)]+)\)/);
					if (urlMatch) {
						const url = urlMatch[1];
						try {
							const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
							results.accessible++;
							const cells = line.split('|').map(cell => cell.trim());
							const newLine = `| ${cells[1]} | ${cells[2]} | ${cells[3]} | ${cells[4]} | ${cells[5]} | ${new Date().toISOString().split('T')[0]} | ✅ | ${cells[cells.length - 2]} |`;
							modifiedLines[i] = newLine;
						} catch (error) {
							results.inaccessible++;
							results.errors.push({ url, error: error.message });
							const cells = line.split('|').map(cell => cell.trim());
							const newLine = `| ${cells[1]} | ${cells[2]} | ${cells[3]} | ${cells[4]} | ${cells[5]} | ${new Date().toISOString().split('T')[0]} | ❌ | ${cells[cells.length - 2]} |`;
							modifiedLines[i] = newLine;
						}
						checkedCount++;
						new Notice(`Checking bookmarks: ${checkedCount}`);
						await new Promise(resolve => setTimeout(resolve, delay));
					}
				}
			}
	
			// Update file content
			const updatedContent = modifiedLines.join('\n');
			if (updatedContent !== content) {
				await this.app.vault.modify(file, updatedContent);
			}
		}
	
		new Notice(`Accessibility check complete!\nAccessible: ${results.accessible}\nInaccessible: ${results.inaccessible}`);
		console.log('Bookmark accessibility check results:', results);
		
		return results;
	}

    categorize(title: string, href: string): CategoryResult {
        const lowerTitle = title.toLowerCase();
        const lowerUrl = href.toLowerCase();
        
        // Default category and subcategory
        let category = 'General';
        let subcategory = '';
    
        // Helper function to check keywords
        const matchesKeywords = (text: string, keywords: string[]): boolean => 
            keywords.some(keyword => text.includes(keyword));
    
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
				extractSubcategory: (lowerUrl: string) => {
					const match = lowerUrl.match(/wikipedia\.org\/wiki\/Category:(.+)/);
					return match ? match[1].replace(/_/g, ' ').split('/')[0] : '';
				}
			},
			{
				category: 'Blogs',
				keywords: ['blog'],
				subcategories: {
					Technology: ['tech', 'programming'],
					Business: ['business', 'economics'],
					Sports: ['sports', 'sport'],
					Politics: ['politics', 'government']
				}
			},
			{
				category: 'Social Media',
				keywords: ['social', 'media'],
				subcategories: {
					Social: ['social', 'community'],
					Media: ['media', 'news']
				}
			},
			{
				category: 'Travel',
				keywords: ['travel', 'tourism'],
				subcategories: {
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
    
                break;
            }
        }
    
        return { category, subcategory };
    }

    extractTags(title: string, url: string): string[] {
        const tags = new Set<string>();

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

    async importBookmarks(htmlContent: string) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const linksNodeList = doc.querySelectorAll('a');
            const links = Array.from(linksNodeList);
            
            if (links.length === 0) {
                new Notice('No bookmarks found in the file.');
                return;
            }

            const bookmarks: Record<string, Record<string, Set<Bookmark>>> = {};
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
                new Notice('No valid bookmarks found.');
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

            new Notice(
                `Import complete!\nTotal: ${stats.total}\nNew: ${stats.new}\nExisting: ${stats.existing}`
            );
        } catch (error) {
            console.error('Error processing bookmarks:', error);
            new Notice('Error processing bookmarks. Check console for details.');
        }
    }

    private async readExistingBookmarks(category: string, subcategory: string): Promise<Set<string>> {
        const outputFolderPath = normalizePath(this.settings.outputFolderPath);
        const fileName = normalizePath(path.join(outputFolderPath, `${category}.md`));
        const file = this.app.vault.getAbstractFileByPath(fileName);
        
        if (!file || !(file instanceof TFile)) return new Set<string>();

        const content = await this.app.vault.read(file);
        const existingUrls = new Set<string>();
        
        const lines = content.split('\n');
        let insideTable = false;
        
        for (const line of lines) {
            if (line.startsWith('| Title |')) {
                insideTable = true;
                continue;
            }
            if (line.startsWith('|---')) continue;
            
            if (insideTable && line.trim().startsWith('|')) {
                const cells = line.split(/(?<!\\)\|/).map(cell => cell.trim());
                if (cells.length >= 3) {
                    const urlMatch = cells[2].match(/\[🔗\]\((.*?)\)/);
                    if (urlMatch) {
                        existingUrls.add(urlMatch[1]);
					}
                }
            }
        }
        
        return existingUrls;
    }

    private async appendBookmarks(category: string, subcategory: string, newBookmarks: Bookmark[]) {
        const outputFolderPath = normalizePath(this.settings.outputFolderPath);

        if (!this.app.vault.getAbstractFileByPath(outputFolderPath)) {
            await this.app.vault.createFolder(outputFolderPath);
        }

        const fileName = normalizePath(path.join(outputFolderPath, `${category}.md`));
        const file = this.app.vault.getAbstractFileByPath(fileName);
        
		// Table headers template (remove indentation and extra spaces)
		const tableHeader = `| Title | URL | Tags | Added | Description | Last Check | Status |
|---------|-----|------|--------|------------|------------|--------|
`;

        let content = '';
        let existingContent = '';
        
        if (file instanceof TFile) {
            existingContent = await this.app.vault.read(file);
            if (!existingContent.includes(`## ${subcategory}`)) {
                content = existingContent + `\n\n## ${subcategory}\n\n` + tableHeader;
            } else {
                const sections = existingContent.split(/(?=## )/);
                content = sections.map(section => {
                    if (section.startsWith(`## ${subcategory}`)) {
                        if (!section.includes('| Title |')) {
                            return `## ${subcategory}\n\n${tableHeader}`;
                        }
                        return section;
                    }
                    return section;
                }).join('');
            }
        } else {
            content = `# ${category} Bookmarks\n\n## ${subcategory}\n\n${tableHeader}`;
        }

        // Helper function to escape and format cell content
        const formatCell = (content: string): string => {
            if (!content) return '';
            return content
                .replace(/\|/g, '\\|')
                .replace(/\n/g, ' ')
                .trim();
        };

		// In the appendBookmarks method, update the bookmark addition:
		newBookmarks.forEach(bookmark => {
			const formattedTitle = formatCell(bookmark.title);
			const formattedUrl = `[🔗](${bookmark.url})`;
			const formattedTags = formatCell(bookmark.tags.join(' '));
			const formattedDate = formatCell(bookmark.addDate || '');
			const formattedDesc = formatCell(bookmark.description || '');
			const lastCheck = ''; // New bookmarks haven't been checked yet
			const status = ''; // No status yet

			content += `| ${formattedTitle} | ${formattedUrl} | ${formattedTags} | ${formattedDate} | ${formattedDesc} | ${lastCheck} | ${status} |\n`;
		});

        if (file instanceof TFile) {
            await this.app.vault.modify(file, content);
        } else {
            await this.app.vault.create(fileName, content);
        }
    }
}

class BrowserFavoritesSettingTab extends PluginSettingTab {
    plugin: BrowserFavoritesPlugin;

    constructor(app: App, plugin: BrowserFavoritesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: 'Browser Favorites Settings'});

        new Setting(containerEl)
            .setName('Output folder')
            .setDesc('Where to store the imported bookmarks')
            .addText(text => text
                .setPlaceholder('Browser Favorites')
                .setValue(this.plugin.settings.outputFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.outputFolderPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Check bookmark accessibility')
            .setDesc('Periodically check if bookmarks are still accessible (may affect performance)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.checkAccessibility)
                .onChange(async (value) => {
                    this.plugin.settings.checkAccessibility = value;
                    await this.plugin.saveSettings();
                }));
    }
}