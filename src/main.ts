import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface BrowserFavoritesSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: BrowserFavoritesSettings = {
	mySetting: 'default'
}

export default class BrowserFavoritesPlugin extends Plugin {
	settings: BrowserFavoritesSettings;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new BrowserFavoritesSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
			.setName('Setting')
			.setDesc('Description')
			.addText(text => text
				.setPlaceholder('Enter your setting')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}