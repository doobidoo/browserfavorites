import { TFile } from 'obsidian';

export interface BrowserFavoritesSettings {
    outputFolderPath: string;
    checkAccessibility: boolean;
}

export interface Bookmark {
    title: string;
    url: string;
    tags: string[];
    addDate: string;
    lastModified: string;
    description: string;
    category?: string;    
    subcategory?: string;
}

export interface CategoryResult {
    category: string;
    subcategory: string;
}

export const DEFAULT_SETTINGS: BrowserFavoritesSettings = {
    outputFolderPath: 'Browser Favorites',
    checkAccessibility: true
}

export const BOOKMARK_TABLE_HEADERS = {
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