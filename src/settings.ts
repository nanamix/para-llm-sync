import { App, PluginSettingTab, Setting } from "obsidian";
import type ParaLLMSyncPlugin from "./main";

export type LLMProvider = "gemini" | "claude" | "openrouter";

export interface PluginSettings {
  provider: LLMProvider;
  geminiApiKey: string;
  geminiModel: string;
  claudeApiKey: string;
  claudeModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
  dailyDigestHour: number;    // 0-23
  weeklyReviewDay: number;    // 0=일요일
  journalPath: string;
  wikiPath: string;
  maxNotesPerRun: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  provider: "gemini",
  geminiApiKey: "",
  geminiModel: "gemini-2.0-flash",
  claudeApiKey: "",
  claudeModel: "claude-sonnet-4-6",
  openrouterApiKey: "",
  openrouterModel: "openai/gpt-4o",
  dailyDigestHour: 23,
  weeklyReviewDay: 0,
  journalPath: "9000_JOURNAL",
  wikiPath: "LLM-Wiki",
  maxNotesPerRun: 20,
};

export class ParaSettingsTab extends PluginSettingTab {
  plugin: ParaLLMSyncPlugin;

  constructor(app: App, plugin: ParaLLMSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "PARA LLM Sync 설정" });

    new Setting(containerEl)
      .setName("LLM Provider")
      .setDesc("기본 LLM Provider (Gemini 권장)")
      .addDropdown((d) =>
        d
          .addOptions({ gemini: "Gemini", claude: "Claude", openrouter: "OpenRouter" })
          .setValue(this.plugin.settings.provider)
          .onChange(async (v) => {
            this.plugin.settings.provider = v as LLMProvider;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Gemini API Key").addText((t) => {
      t.inputEl.type = "password";
      t
        .setPlaceholder("AIza...")
        .setValue(this.plugin.settings.geminiApiKey)
        .onChange(async (v) => {
          this.plugin.settings.geminiApiKey = v;
          await this.plugin.saveSettings();
        });
      return t;
    });

    new Setting(containerEl).setName("Gemini Model").addDropdown((d) =>
      d
        .addOptions({ "gemini-2.0-flash": "gemini-2.0-flash", "gemini-1.5-pro": "gemini-1.5-pro" })
        .setValue(this.plugin.settings.geminiModel)
        .onChange(async (v) => {
          this.plugin.settings.geminiModel = v;
          await this.plugin.saveSettings();
        })
    );

    new Setting(containerEl).setName("Claude API Key").addText((t) => {
      t.inputEl.type = "password";
      t
        .setPlaceholder("sk-ant-...")
        .setValue(this.plugin.settings.claudeApiKey)
        .onChange(async (v) => {
          this.plugin.settings.claudeApiKey = v;
          await this.plugin.saveSettings();
        });
      return t;
    });

    new Setting(containerEl).setName("Claude Model").addDropdown((d) =>
      d
        .addOptions({ "claude-sonnet-4-6": "claude-sonnet-4-6", "claude-haiku-4-5-20251001": "claude-haiku-4-5" })
        .setValue(this.plugin.settings.claudeModel)
        .onChange(async (v) => {
          this.plugin.settings.claudeModel = v;
          await this.plugin.saveSettings();
        })
    );

    new Setting(containerEl).setName("OpenRouter API Key").addText((t) => {
      t.inputEl.type = "password";
      t
        .setPlaceholder("sk-or-...")
        .setValue(this.plugin.settings.openrouterApiKey)
        .onChange(async (v) => {
          this.plugin.settings.openrouterApiKey = v;
          await this.plugin.saveSettings();
        });
      return t;
    });

    new Setting(containerEl)
      .setName("OpenRouter Model")
      .setDesc("예: openai/gpt-4o, anthropic/claude-3-5-sonnet")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.openrouterModel)
          .onChange(async (v) => {
            this.plugin.settings.openrouterModel = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Daily Digest 시각 (시)")
      .setDesc("0-23 사이 정수")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.dailyDigestHour))
          .onChange(async (v) => {
            const n = parseInt(v);
            if (!isNaN(n) && n >= 0 && n <= 23) {
              this.plugin.settings.dailyDigestHour = n;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Weekly Review 요일")
      .setDesc("0=일, 1=월, ... 6=토")
      .addDropdown((d) =>
        d
          .addOptions({ "0": "일", "1": "월", "2": "화", "3": "수", "4": "목", "5": "금", "6": "토" })
          .setValue(String(this.plugin.settings.weeklyReviewDay))
          .onChange(async (v) => {
            this.plugin.settings.weeklyReviewDay = parseInt(v);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("저널 경로").addText((t) =>
      t.setValue(this.plugin.settings.journalPath).onChange(async (v) => {
        this.plugin.settings.journalPath = v;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("LLM-Wiki 경로").addText((t) =>
      t.setValue(this.plugin.settings.wikiPath).onChange(async (v) => {
        this.plugin.settings.wikiPath = v;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl)
      .setName("최대 처리 노트 수")
      .setDesc("API 비용 제한 (기본 20)")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.maxNotesPerRun))
          .onChange(async (v) => {
            const n = parseInt(v);
            if (!isNaN(n) && n > 0) {
              this.plugin.settings.maxNotesPerRun = n;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
