import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, ButtonComponent, normalizePath } from 'obsidian';
import * as path from 'path';

const PLUGIN_VERSION = '2.0.0';

const BOOKMARK_TABLE_HEADERS = {
    columns: [
        'Title',
        'URL',
        'Tags',
        'Added',
        'Description',
        'Last Check',
        'Status'
    ],
    get header(): string {
        const headerRow = `| ${this.columns.join(' | ')} |`;
        const separatorRow = `|${this.columns.map(() => '------').join('|')}|`;
        return `${headerRow}\n${separatorRow}\n`;
    }
};
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
    category?: string;    // Optional
    subcategory?: string; // Optional
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
    contentEl!: HTMLElement;
    titleEl!: HTMLElement;

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
            .addButton((button: ButtonComponent) => {
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
    app: App;

    async onload() {
        await this.loadSettings();

        // Version in der Ribbon-Icon Tooltip anzeigen
        this.addRibbonIcon('browser', `Browser Favorites v${PLUGIN_VERSION}`, () => {
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

        this.addCommand({
            id: 'cleanup-duplicates',
            name: 'Cleanup Duplicate Bookmarks',
            callback: async () => {
                await this.cleanupDuplicates();
                new Notice('Duplicate cleanup completed!');
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
        const delay = 1000;
        const results = {
            accessible: 0,
            inaccessible: 0,
            errors: [] as { url: string; error: string }[]
        };
    
        // Hilfsfunktion zum Extrahieren von Meta-Informationen
        async function fetchMetaInfo(url: string) {
            try {
                const response = await fetch(url);
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                
                return {
                    description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                                doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
                    tags: Array.from(doc.querySelectorAll('meta[name="keywords"]'))
                        .map(el => el.getAttribute('content')?.split(',') || [])
                        .flat()
                        .map(tag => tag.trim())
                        .filter(tag => tag)
                        .map(tag => tag.startsWith('#') ? tag : `#${tag}`),
                    title: doc.querySelector('title')?.textContent || ''
                };
            } catch (error) {
                console.error('Error fetching meta info:', error);
                return { description: '', tags: [], title: '' };
            }
        }
    
        for (const file of files) {
            const content = await this.app.vault.read(file);
            let newContent = content;
            const lines = content.split('\n');
            let isInTable = false;
            let modifiedLines = [...lines];
    
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                if (line.startsWith('| Title |')) {
                    isInTable = true;
                    // Update header if needed
                    modifiedLines[i] = BOOKMARK_TABLE_HEADERS.header;
                    i++;
                    continue;
                }
    
                if (isInTable && line.startsWith('|') && !line.startsWith('|--')) {
                    const urlMatch = line.match(/\[🔗\]\((https?:\/\/[^\)]+)\)/);
                    if (urlMatch) {
                        const url = urlMatch[1];
                        try {
                            // Fetch meta info and accessibility check
                            const metaInfo = await fetchMetaInfo(url);
                            results.accessible++;
    
                            const cells = line.split('|').map(cell => cell.trim());
                            const existingTags = cells[3] ? cells[3].split(' ') : [];
                            const combinedTags = [...new Set([...existingTags, ...metaInfo.tags])].join(' ');
                            
                            // Combine existing and new description
                            const existingDesc = cells[5] || '';
                            const newDesc = metaInfo.description;
                            const finalDesc = existingDesc || newDesc;
    
                            const newLine = `| ${cells[1]} | ${cells[2]} | ${combinedTags} | ${cells[4]} | ${finalDesc} | ${new Date().toISOString().split('T')[0]} | ✅ |`;
                            modifiedLines[i] = newLine;
                        } catch (error) {
                            results.inaccessible++;
                            results.errors.push({ url, error: error.message });
                            const cells = line.split('|').map((cell: string) => cell.trim())
                            const newLine = `| ${cells[1]} | ${cells[2]} | ${cells[3]} | ${cells[4]} | ${cells[5]} | ${new Date().toISOString().split('T')[0]} | ❌ |`;
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

    // Neue Hilfsmethode zum Deduplizieren von Bookmarks
    private deduplicateBookmarks(bookmarks: Bookmark[]): Bookmark[] {
        // Gruppiere Bookmarks nach URL
        const bookmarkMap = new Map<string, Bookmark[]>();
        
        bookmarks.forEach(bookmark => {
            const existingGroup = bookmarkMap.get(bookmark.url) || [];
            existingGroup.push(bookmark);
            bookmarkMap.set(bookmark.url, existingGroup);
        });

        // Für jede URL den neuesten Eintrag behalten
        const deduplicatedBookmarks: Bookmark[] = [];
        bookmarkMap.forEach(group => {
            const newestBookmark = group.reduce((newest, current) => {
                const newestDate = newest.addDate ? new Date(parseInt(newest.addDate) * 1000) : new Date(0);
                const currentDate = current.addDate ? new Date(parseInt(current.addDate) * 1000) : new Date(0);
                return currentDate > newestDate ? current : newest;
            });
            
            // Kombiniere Tags von allen Duplikaten
            const allTags = new Set<string>();
            group.forEach(bookmark => {
                bookmark.tags.forEach(tag => allTags.add(tag));
            });
            newestBookmark.tags = Array.from(allTags);
            
            deduplicatedBookmarks.push(newestBookmark);
        });

        return deduplicatedBookmarks;
    }

    // Update der Import-Methode
    async importBookmarks(htmlContent: string) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const bookmarks = this.parseBookmarks(doc.body);
        
        // Dedupliziere Bookmarks vor dem Import
        const deduplicatedBookmarks = this.deduplicateBookmarks(bookmarks);
        
        // Gruppiere nach Kategorien
        const bookmarksByCategory = new Map<string, Map<string, Bookmark[]>>();
        
        deduplicatedBookmarks.forEach(bookmark => {
            const category = bookmark.category || 'Uncategorized';
            const subcategory = bookmark.subcategory || 'General';
            
            if (!bookmarksByCategory.has(category)) {
                bookmarksByCategory.set(category, new Map());
            }
            
            const categoryMap = bookmarksByCategory.get(category)!;
            if (!categoryMap.has(subcategory)) {
                categoryMap.set(subcategory, []);
            }
            
            categoryMap.get(subcategory)!.push(bookmark);
        });

        // Importiere deduplizierte Bookmarks
        for (const [category, subcategories] of bookmarksByCategory) {
            for (const [subcategory, bookmarks] of subcategories) {
                // Prüfe auf existierende Bookmarks
                const existingUrls = await this.readExistingBookmarks(category, subcategory);
                
                // Filtere bereits existierende Bookmarks
                const newBookmarks = bookmarks.filter(bookmark => !existingUrls.has(bookmark.url));
                
                if (newBookmarks.length > 0) {
                    await this.appendBookmarks(category, subcategory, newBookmarks);
                }
            }
        }

        new Notice(`Import completed! ${deduplicatedBookmarks.length} bookmarks processed.`);
    }

    // Methode zum Bereinigen existierender Dateien
    async cleanupDuplicates() {
        const outputFolderPath = normalizePath(this.settings.outputFolderPath);
        const files = this.app.vault.getFiles().filter((file: TFile) =>
            file.path.startsWith(outputFolderPath) && file.extension === 'md'
        );
    
        for (const file of files) {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            let newContent: string[] = [];
            let currentSection = '';
            let bookmarksBySection = new Map<string, Bookmark[]>();
            let isInTable = false;
            
            // Erste Durchgang: Sammle alle Bookmarks nach Abschnitten
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                if (line.startsWith('## ')) {
                    currentSection = line.substring(3).trim();
                    bookmarksBySection.set(currentSection, []);
                    continue;
                }
                
                if (line.startsWith('| Title |')) {
                    isInTable = true;
                    continue;
                }
                
                if (isInTable && line.startsWith('|') && !line.startsWith('|--')) {
                    const cells = line.split('|').map(cell => cell.trim());
                    const urlMatch = cells[2].match(/\[🔗\]\((https?:\/\/[^\)]+)\)/);
                    
                    if (urlMatch && currentSection) {
                        const bookmark: Bookmark = {
                            title: cells[1],
                            url: urlMatch[1],
                            tags: cells[3] ? cells[3].split(' ') : [],
                            addDate: cells[4],
                            lastModified: cells[6] || '',
                            description: cells[5] || ''
                        };
                        bookmarksBySection.get(currentSection)?.push(bookmark);
                    }
                }
            }
            
            // Zweiter Durchgang: Erstelle neue Datei mit deduplizierten Bookmarks
            let headerSection = '';
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                if (line.startsWith('# ')) {
                    headerSection = line;
                    newContent.push(line);
                    continue;
                }
                
                if (line.startsWith('## ')) {
                    currentSection = line.substring(3).trim();
                    newContent.push('');
                    newContent.push(line);
                    newContent.push('');
                    
                    // Füge Tabellen-Header hinzu
                    newContent.push(BOOKMARK_TABLE_HEADERS.header);
                    
                    // Füge deduplizierte Bookmarks hinzu
                    const sectionBookmarks = bookmarksBySection.get(currentSection) || [];
                    const deduplicatedBookmarks = this.deduplicateBookmarks(sectionBookmarks);
                    
                    deduplicatedBookmarks.forEach(bookmark => {
                        newContent.push(this.formatBookmarkLine(bookmark));
                    });
                    
                    // Überspringe die alte Tabelle
                    while (i < lines.length && (lines[i].startsWith('|') || lines[i].trim() === '')) {
                        i++;
                    }
                    i--;
                }
            }
            
            // Aktualisiere die Datei
            await this.app.vault.modify(file, newContent.join('\n'));
        }
        
        new Notice('Duplicate cleanup completed!');
    }

    private async readExistingBookmarks(category: string, subcategory: string): Promise<Set<string>> {
        const outputFolderPath = normalizePath(this.settings.outputFolderPath);
        const fileName = normalizePath(path.join(outputFolderPath, `${category}.md`));
        const file = this.app.vault.getAbstractFileByPath(fileName);
        
        if (!file || !(file instanceof TFile)) return new Set<string>();
    
        const content = await this.app.vault.read(file);
        const existingUrls = new Set<string>();
        
        const lines = content.split('\n');
        let currentSection = '';
        
        for (const line of lines) {
            // Überprüfen Sie den Abschnitt
            if (line.startsWith('## ')) {
                currentSection = line.substring(3).trim();
                continue;
            }
            
            // Nur URLs aus dem relevanten Unterabschnitt extrahieren
            if (currentSection === subcategory) {
                const urlMatch = line.match(/\[🔗\]\((https?:\/\/[^\)]+)\)/);
                if (urlMatch) {
                    existingUrls.add(urlMatch[1]);
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
        
        const tableHeader = BOOKMARK_TABLE_HEADERS.header;
    
        let content = '';
        
        if (file instanceof TFile) {
            const existingContent = await this.app.vault.read(file);
            const sections = existingContent.split(/(?=## )/);
            let subcategoryFound = false;
            
            content = sections.map(section => {
                if (section.startsWith(`## ${subcategory}`)) {
                    subcategoryFound = true;
                    let sectionContent = `## ${subcategory}\n\n${tableHeader}`;
                    newBookmarks.forEach(bookmark => {
                        sectionContent += this.formatBookmarkLine(bookmark);
                    });
                    return sectionContent;
                }
                return section;
            }).join('');
            
            if (!subcategoryFound) {
                content += `\n\n## ${subcategory}\n\n${tableHeader}`;
                newBookmarks.forEach(bookmark => {
                    content += this.formatBookmarkLine(bookmark);
                });
            }
        } else {
            content = `# ${category} Bookmarks\n\n## ${subcategory}\n\n${BOOKMARK_TABLE_HEADERS.header}`;
            newBookmarks.forEach(bookmark => {
                content += this.formatBookmarkLine(bookmark);
            });
        }
    
        if (file instanceof TFile) {
            await this.app.vault.modify(file, content);
        } else {
            await this.app.vault.create(fileName, content);
        }
    }

    // Neue Hilfsmethode zum Formatieren der Bookmark-Zeilen
    private formatBookmarkLine(bookmark: Bookmark): string {
        const formatCell = (content: string): string => {
            if (!content) return '';
            return content
                .replace(/\|/g, '\\|')
                .replace(/\n/g, ' ')
                .trim();
        };

        const formattedTitle = formatCell(bookmark.title);
        const formattedUrl = `[🔗](${bookmark.url})`;
        const formattedTags = formatCell(bookmark.tags.join(' '));
        const formattedDate = formatCell(bookmark.addDate || '');
        const formattedDesc = formatCell(bookmark.description || '');
        const lastCheck = '';
        const status = '';

        return `| ${formattedTitle} | ${formattedUrl} | ${formattedTags} | ${formattedDate} | ${formattedDesc} | ${lastCheck} | ${status} |\n`;
    }

    private parseBookmarks(element: HTMLElement): Bookmark[] {
        const bookmarks: Bookmark[] = [];
        
        // Rekursive Funktion zum Durchsuchen des DOM
        const traverse = (node: HTMLElement) => {
            // Verarbeite alle A-Tags (Links)
            if (node.tagName === 'A') {
                const url = node.getAttribute('href');
                const title = node.textContent?.trim() || '';
                const addDate = node.getAttribute('add_date') || '';
                const lastModified = node.getAttribute('last_modified') || '';
                
                if (url && title) {
                    // Kategorisiere den Bookmark
                    const { category, subcategory } = this.categorize(title, url);
                    
                    // Extrahiere Tags
                    const tags = this.extractTags(title, url);
                    
                    bookmarks.push({
                        title,
                        url,
                        tags,
                        addDate,
                        lastModified,
                        description: '',
                        category,
                        subcategory
                    });
                }
            }
            
            // Durchsuche alle Kinder-Elemente
            const children = Array.from(node.children);
            children.forEach(child => {
                if (child instanceof HTMLElement) {
                    traverse(child);
                }
            });
        };
        
        traverse(element);
        return bookmarks;
    }
}
class BrowserFavoritesSettingTab extends PluginSettingTab {
    plugin: BrowserFavoritesPlugin;
    containerEl!: HTMLElement;

    constructor(app: App, plugin: BrowserFavoritesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: 'Browser Favorites Settings'});
        
        // Überschrift mit Version
        containerEl.createEl('h2', {text: `Browser Favorites Settings (v${PLUGIN_VERSION})`});

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
    
        // Version am Ende der Settings anzeigen
        containerEl.createEl('div', {
            text: `Version: ${PLUGIN_VERSION}`,
            cls: 'browser-favorites-version-info'
        });
    }
}