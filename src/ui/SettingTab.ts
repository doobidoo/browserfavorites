import { App, PluginSettingTab, Setting } from 'obsidian';
import BrowserFavoritesPlugin from '../main';

export class BrowserFavoritesSettingTab extends PluginSettingTab {
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