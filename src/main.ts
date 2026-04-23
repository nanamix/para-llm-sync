// src/main.ts
import { Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, ParaSettingsTab } from "./settings";
import type { PluginSettings } from "./settings";
import { NoteCollector } from "./core/NoteCollector";
import { WikiWriter, IndexUpdater } from "./core/WikiWriter";
import { PromotionPipeline } from "./core/PromotionPipeline";
import { createLLMClientChain } from "./core/LLMClient";
import { CronTrigger } from "./scheduler/CronTrigger";
import { StatusBar } from "./ui/StatusBar";

export default class ParaLLMSyncPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private cron: CronTrigger | null = null;
  private statusBar: StatusBar | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new ParaSettingsTab(this.app, this));

    const statusBarEl = this.addStatusBarItem();
    this.statusBar = new StatusBar(statusBarEl);

    this.addCommand({
      id: "run-daily-digest",
      name: "Run Daily Digest",
      callback: () => this.runDailyDigest(),
    });

    this.addCommand({
      id: "run-weekly-review",
      name: "Run Weekly Review",
      callback: () => this.runWeeklyReview(),
    });

    this.addCommand({
      id: "analyze-para",
      name: "Analyze PARA",
      callback: () => this.runPARAAnalysis(),
    });

    this.cron = new CronTrigger({
      dailyHour: this.settings.dailyDigestHour,
      weeklyDay: this.settings.weeklyReviewDay,
      onDaily: () => this.runDailyDigest(),
      onWeekly: () => this.runWeeklyReview(),
    });
    this.cron.start();
  }

  onunload(): void {
    this.cron?.stop();
  }

  private buildPipeline(): PromotionPipeline {
    const chain = createLLMClientChain(this.settings);
    if (chain.length === 0) {
      throw new Error("API 키가 설정되지 않았습니다. 플러그인 설정을 확인하세요.");
    }
    const writer = new WikiWriter(this.app, this.settings.wikiPath);
    const indexUpdater = new IndexUpdater(this.app, this.settings.wikiPath);
    return new PromotionPipeline(chain, writer, indexUpdater);
  }

  async runDailyDigest(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    this.statusBar?.setRunning(this.settings.provider);
    try {
      const collector = new NoteCollector(this.app, this.settings.journalPath, this.settings.maxNotesPerRun);
      const notes = await collector.collectJournal(today, today);
      if (notes.length === 0) {
        new Notice("오늘 저널 노트가 없습니다.");
        this.statusBar?.setDone(0, 0);
        return;
      }
      const result = await this.buildPipeline().run(notes, today);
      new Notice(`Daily Digest 완료: ${result.created.length}건 생성`);
      this.statusBar?.setDone(result.created.length, result.skipped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      new Notice(`PARA LLM Sync 오류: ${msg}`);
      this.statusBar?.setError(msg);
    }
  }

  async runWeeklyReview(): Promise<void> {
    const today = new Date();
    const toDate = today.toISOString().slice(0, 10);
    const fromDate = new Date(today.getTime() - 7 * 86400_000).toISOString().slice(0, 10);
    this.statusBar?.setRunning(this.settings.provider);
    try {
      const collector = new NoteCollector(this.app, this.settings.journalPath, this.settings.maxNotesPerRun);
      const notes = await collector.collectJournal(fromDate, toDate);
      const result = await this.buildPipeline().run(notes, toDate);
      new Notice(`Weekly Review 완료: ${result.created.length}건 생성`);
      this.statusBar?.setDone(result.created.length, result.skipped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      new Notice(`PARA LLM Sync 오류: ${msg}`);
      this.statusBar?.setError(msg);
    }
  }

  async runPARAAnalysis(): Promise<void> {
    new Notice("PARA Analysis는 준비 중입니다.");
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
