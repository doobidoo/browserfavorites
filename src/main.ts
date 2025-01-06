// Importiere zusätzliche benötigte Obsidian-Module
import { 
    Plugin, 
    Notice, 
    TFile, 
    App,
    Modal,
    Setting,
    normalizePath 
} from 'obsidian';
import { FileUploadModal } from './ui/FileUploadModal';
import { BrowserFavoritesSettingTab } from './ui/SettingTab';
import { 
    BrowserFavoritesSettings, 
    Bookmark, 
    DEFAULT_SETTINGS,
    BOOKMARK_TABLE_HEADERS,
    CategoryResult 
} from './models/types';
import {
    deduplicateBookmarkArray,
    formatBookmarkLine,
    categorize
} from './utils/bookmarkUtils';
import * as path from 'path';

const PLUGIN_VERSION = '3.1.10';

export default class BrowserFavoritesPlugin extends Plugin {
    settings: BrowserFavoritesSettings;
    app: App;

    async onload() {
        await this.loadSettings();

        // Füge Ribbon-Icon für schnellen Zugriff hinzu
        this.addRibbonIcon('bookmark', 'Import Browser Bookmarks', () => {
            new FileUploadModal(this.app, (content) => {
                this.importBookmarks(content);
            }).open();
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
    
        // Zähle zuerst alle zu prüfenden Bookmarks
        let totalBookmarks = 0;
        for (const file of files) {
            const content = await this.app.vault.read(file);
            const bookmarkLines = content.split('\n').filter(line => 
                line.startsWith('|') && 
                !line.startsWith('| Title') && 
                !line.startsWith('|--') &&
                line.includes('[🔗]')
            );
            totalBookmarks += bookmarkLines.length;
        }
    
        // Wenn keine Bookmarks gefunden wurden
        if (totalBookmarks === 0) {
            new Notice('No bookmarks found to check!');
            return;
        }
    
        // Frage den Benutzer, ob alle oder nur ausgewählte Dateien geprüft werden sollen
        const shouldCheckAll = await new Promise(resolve => {
            const notice = new Notice(
                `Found ${totalBookmarks} bookmarks in ${files.length} files.\nCheck all?`, 
                0
            );
            notice.noticeEl.createEl('button', {text: 'Check All'})
                .onclick = () => {
                    notice.hide();
                    resolve(true);
                };
            notice.noticeEl.createEl('button', {text: 'Select Files'})
                .onclick = () => {
                    notice.hide();
                    resolve(false);
                };
        });
    
        // Wenn nicht alle geprüft werden sollen, lass den Benutzer Dateien auswählen
        let filesToCheck = files;
        if (!shouldCheckAll) {
            filesToCheck = await this.selectFilesToCheck(files);
            if (filesToCheck.length === 0) {
                new Notice('No files selected for checking.');
                return;
            }
        }
    
        let checkedCount = 0;
        const delay = 1000;
        const results = {
            accessible: 0,
            inaccessible: 0,
            errors: [] as { url: string; error: string }[]
        };
    
        // Fortschrittsbalken initialisieren
        const progressNotice = new Notice('', 0);
        const updateProgress = (file: TFile, current: number, total: number) => {
            const percent = Math.round((current / total) * 100);
            const fileName = file.basename;
            progressNotice.setMessage(
                `Checking: ${fileName}\n` +
                `Progress: ${current}/${total} (${percent}%)\n` +
                `✅ ${results.accessible} | ❌ ${results.inaccessible}`
            );
        };
    
        for (const file of filesToCheck) {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            let isInTable = false;
            let modifiedLines = [...lines];
    
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                if (line.startsWith('| Title |')) {
                    isInTable = true;
                    modifiedLines[i] = BOOKMARK_TABLE_HEADERS.header.trimEnd();
                    i++;
                    continue;
                }
    
                if (isInTable && line.startsWith('|') && !line.startsWith('|--')) {
                    const urlMatch = line.match(/\[🔗\]\((https?:\/\/[^\)]+)\)/);
                    if (urlMatch) {
                        const url = urlMatch[1];
                        try {
                            const metaInfo = await this.fetchMetaInfo(url);
                            results.accessible++;
    
                            const cells = line.split('|').map(cell => cell.trim());
                            const existingTags = cells[3] ? cells[3].split(' ') : [];
                            const combinedTags = [...new Set([...existingTags, ...metaInfo.tags])].join(' ');
                            
                            const existingDesc = cells[5] || '';
                            const newDesc = metaInfo.description;
                            const finalDesc = existingDesc || newDesc;
    
                            modifiedLines[i] = `| ${cells[1]} | ${cells[2]} | ${combinedTags} | ${cells[4]} | ${finalDesc} | ${new Date().toISOString().split('T')[0]} | ✅ |`;
                        } catch (error) {
                            results.inaccessible++;
                            results.errors.push({ url, error: error.message });
                            const cells = line.split('|').map(cell => cell.trim());
                            modifiedLines[i] = `| ${cells[1]} | ${cells[2]} | ${cells[3]} | ${cells[4]} | ${cells[5]} | ${new Date().toISOString().split('T')[0]} | ❌ |`;
                        }
                        checkedCount++;
                        updateProgress(file, checkedCount, totalBookmarks);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
    
            const updatedContent = modifiedLines.join('\n');
            if (updatedContent !== content) {
                await this.app.vault.modify(file, updatedContent);
            }
        }
    
        progressNotice.hide();
        new Notice(
            `Accessibility check complete!\n` +
            `✅ Accessible: ${results.accessible}\n` +
            `❌ Inaccessible: ${results.inaccessible}`
        );
        console.log('Bookmark accessibility check results:', results);
        
        return results;
    }
    
    // Neue Hilfsmethode zur Dateiauswahl
    private async selectFilesToCheck(files: TFile[]): Promise<TFile[]> {
        return new Promise(async (resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.setText('Select files to check');
            
            const selectedFiles = new Set<TFile>();
            const bookmarkCounts = new Map<TFile, number>();
            
            // Zähle Bookmarks pro Datei
            for (const file of files) {
                const content = await this.app.vault.read(file);
                const count = content.split('\n').filter(line => 
                    line.startsWith('|') && 
                    !line.startsWith('| Title') && 
                    !line.startsWith('|--') &&
                    line.includes('[🔗]')
                ).length;
                bookmarkCounts.set(file, count);
            }
            
            files.forEach(file => {
                const count = bookmarkCounts.get(file) || 0;
                const setting = new Setting(modal.contentEl)
                    .addToggle(toggle => toggle
                        .onChange(value => {
                            if (value) {
                                selectedFiles.add(file);
                            } else {
                                selectedFiles.delete(file);
                            }
                        }))
                    .setName(`${file.basename} (${count} bookmarks)`);
            });
    
            new Setting(modal.contentEl)
                .addButton(btn => btn
                    .setButtonText('Confirm')
                    .onClick(() => {
                        modal.close();
                        // Berechne die neue Gesamtzahl der Bookmarks
                        const totalSelectedBookmarks = Array.from(selectedFiles)
                            .reduce((sum, file) => sum + (bookmarkCounts.get(file) || 0), 0);
                        resolve(Array.from(selectedFiles));
                    }))
                .addButton(btn => btn
                    .setButtonText('Cancel')
                    .onClick(() => {
                        modal.close();
                        resolve([]);
                    }));
    
            modal.open();
        });
    }

    // Ausgelagerte fetchMetaInfo Methode
    private async fetchMetaInfo(url: string) {
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
            throw error;
        }
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
 
    // Neue Hilfsmethode zum Abbrechen von Operationen
    private abortController: AbortController | null = null;

    async cleanupDuplicates() {
        // Initialisiere neuen AbortController
        this.abortController = new AbortController();
        
        const outputFolderPath = normalizePath(this.settings.outputFolderPath);
        const files = this.app.vault.getFiles().filter((file: TFile) =>
            file.path.startsWith(outputFolderPath) && file.extension === 'md'
        );

        // Zähle zuerst alle zu prüfenden Bookmarks
        let totalBookmarks = 0;
        for (const file of files) {
            const content = await this.app.vault.read(file);
            const bookmarkLines = content.split('\n').filter(line => 
                line.startsWith('|') && 
                !line.startsWith('| Title') && 
                !line.startsWith('|--') &&
                line.includes('[🔗]')
            );
            totalBookmarks += bookmarkLines.length;
        }

        // Wenn keine Bookmarks gefunden wurden
        if (totalBookmarks === 0) {
            new Notice('No bookmarks found to deduplicate!');
            return;
        }

        // Frage den Benutzer, ob alle oder nur ausgewählte Dateien geprüft werden sollen
        const shouldCheckAll = await new Promise(resolve => {
            const notice = new Notice(
                `Found ${totalBookmarks} bookmarks in ${files.length} files.\nCheck all?`, 
                0
            );
            notice.noticeEl.createEl('button', {text: 'Check All'})
                .onclick = () => {
                    notice.hide();
                    resolve(true);
                };
            notice.noticeEl.createEl('button', {text: 'Select Files'})
                .onclick = () => {
                    notice.hide();
                    resolve(false);
                };
        });

        // Wenn nicht alle geprüft werden sollen, lass den Benutzer Dateien auswählen
        let filesToCheck = files;
        if (!shouldCheckAll) {
            filesToCheck = await this.selectFilesToCheck(files);
            if (filesToCheck.length === 0) {
                new Notice('No files selected for deduplication.');
                return;
            }
        }

        // Fortschrittsanzeige initialisieren
        const progressNotice = new Notice('', 0);
        let processedBookmarks = 0;
        let duplicatesFound = 0;

        const updateProgress = (file: TFile, current: number, total: number, duplicates: number) => {
            const percent = Math.round((current / total) * 100);
            progressNotice.setMessage(
                `Processing: ${file.basename}\n` +
                `Progress: ${current}/${total} (${percent}%)\n` +
                `Duplicates found: ${duplicates}`
            );
        };

        // Abbruch-Button hinzufügen
        const abortNotice = new Notice('', 0);
        abortNotice.noticeEl.createEl('button', {
            text: 'Cancel Deduplication',
            cls: 'mod-warning'
        }).onclick = () => {
            if (this.abortController) {
                this.abortController.abort();
                new Notice('Deduplication cancelled!');
            }
        };

        try {
            for (const file of filesToCheck) {
                if (this.abortController?.signal.aborted) {
                    break;
                }

                const content = await this.app.vault.read(file);
                let newContent: string[] = [];
                let currentSection = '';
                let bookmarksBySection = new Map<string, Bookmark[]>();
                let isInTable = false;
                
                // Erste Durchgang: Sammle alle Bookmarks nach Abschnitten
                const lines = content.split('\n');
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
                            processedBookmarks++;
                            updateProgress(file, processedBookmarks, totalBookmarks, duplicatesFound);
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
                        const deduplicatedBookmarks = this.deduplicateBookmarkArray(sectionBookmarks);
                        duplicatesFound += sectionBookmarks.length - deduplicatedBookmarks.length;
                        
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
                if (this.abortController?.signal.aborted) {
                    break;
                }
                await this.app.vault.modify(file, newContent.join('\n'));
            }

            progressNotice.hide();
            abortNotice.hide();

            if (!this.abortController?.signal.aborted) {
                new Notice(
                    `Deduplication complete!\n` +
                    `Processed: ${processedBookmarks} bookmarks\n` +
                    `Removed: ${duplicatesFound} duplicates`
                );
            }
        } catch (error) {
            console.error('Error during deduplication:', error);
            new Notice('Error during deduplication. Check console for details.');
        } finally {
            this.abortController = null;
        }
    }

    // Update der Import-Methode
    async importBookmarks(htmlContent: string) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const bookmarks = this.parseBookmarks(doc.body);
        
        // Dedupliziere Bookmarks vor dem Import
        const deduplicatedBookmarks = this.deduplicateBookmarkArray(bookmarks);
        
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

    // Hilfsmethoden als Klassenmethoden
    private deduplicateBookmarkArray(bookmarks: Bookmark[]): Bookmark[] {
        return deduplicateBookmarkArray(bookmarks);
    }

    private formatBookmarkLine(bookmark: Bookmark): string {
        return formatBookmarkLine(bookmark);
    }

    private categorize(title: string, url: string): CategoryResult {
        return categorize(title, url);
    }

}
