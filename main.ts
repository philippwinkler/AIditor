import { EditorView, WidgetType, Decoration } from "@codemirror/view";

export class EmojiWidget extends WidgetType {
	toDOM(_view: EditorView): HTMLElement {
		const div = document.createElement("span");

		div.innerText = "👉";

		return div;
	}
}

// const decoration = Decoration.replace({
//   widget: new EmojiWidget()
// });

import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
	DecorationSet,
	PluginSpec,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";

class EmojiListPlugin implements PluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = this.buildDecorations(update.view);
		}
	}

	destroy() {}

	buildDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();

		for (const { from, to } of view.visibleRanges) {
			syntaxTree(view.state).iterate({
				from,
				to,
				enter(node: { type: { name: string }; from: number }) {
					if (node.type.name.startsWith("list")) {
						// Position of the '-' or the '*'.
						const listCharFrom = node.from - 2;

						builder.add(
							listCharFrom,
							listCharFrom + 1,
							Decoration.replace({
								widget: new EmojiWidget(),
							})
						);
					}
				},
			});
		}

		return builder.finish();
	}
}

const pluginSpec: PluginSpec<EmojiListPlugin> = {
	decorations: (value: EmojiListPlugin) => value.decorations,
};

export const emojiListPlugin = ViewPlugin.fromClass(
	EmojiListPlugin,
	pluginSpec
);

import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	openAiApiKey: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	openAiApiKey: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"AIditor Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				console.log("Sending a notice");
				new Notice("This is a notice from AIditor! v2");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		if (this.settings.openAiApiKey == "default") {
			statusBarItemEl.setText("Missing API Key");
		} else {
			statusBarItemEl.setText("Connected");
		}
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				const cursor = editor.getCursor();

				let linenumber = cursor.line;
				console.log("line:", linenumber);

				let line = editor.getLine(linenumber);
				let anchor = cursor.ch;
				let head = anchor;

				do {
					console.log("linenumber:", linenumber);

					// Move backward to find the end of the previous sentence (or the start of the line)
					while (
						anchor > 0 &&
						line[anchor - 1] !== "." &&
						line[anchor - 1] !== "!" &&
						line[anchor - 1] !== "?"
					) {
						anchor--;
					}

					// Move further backward to include any whitespace before the sentence
					while (
						anchor > 0 &&
						(line[anchor - 1] === " " || line[anchor - 1] === "\t")
					) {
						anchor--;
					}

					// Find the start of the sentence
					head = anchor - 1;
					while (
						head > 0 &&
						line[head - 1] !== "." &&
						line[head - 1] !== "!" &&
						line[head - 1] !== "?"
					) {
						head--;
					}
					linenumber--;
					console.log("linenumber:", linenumber);

					if (head === -1) {
						line = editor.getLine(linenumber);
						anchor = line.length;
						console.log("anchor:", anchor);
					}
				} while (linenumber > 0 && head === -1);

				console.log(
					"Selection line:",
					linenumber + 1,
					"anchor:",
					anchor,
					"head:",
					head
				);

				// Make the selection
				editor.setSelection(
					{ line: linenumber + 1, ch: head },
					{ line: linenumber + 1, ch: anchor }
				);
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("mouse click", evt);
		});

		this.registerEditorExtension(emojiListPlugin);

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("OpenAI API Key")
			.setDesc("OpenAI's API Key")
			.addText((text) =>
				text
					.setPlaceholder("set me")
					.setValue(this.plugin.settings.openAiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAiApiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
