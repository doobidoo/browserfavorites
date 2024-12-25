import { App, Modal, Notice, ButtonComponent, Setting } from 'obsidian';

export class FileUploadModal extends Modal {
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
