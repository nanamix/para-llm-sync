// src/scheduler/CronTrigger.ts

export interface CronOptions {
  dailyHour: number;
  weeklyDay: number;
  onDaily: () => Promise<void>;
  onWeekly: () => Promise<void>;
}

export class CronTrigger {
  private intervalId: number | null = null;
  private lastDailyRun: string = "";
  private lastWeeklyRun: string = "";

  constructor(private opts: CronOptions) {}

  start(): void {
    // 매 분마다 체크 (Obsidian window.setInterval 사용)
    this.intervalId = window.setInterval(() => this.tick(), 60_000);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tick(): Promise<void> {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);     // YYYY-MM-DD
    const weekKey = `${today}-w${now.getDay()}`;

    if (
      now.getHours() === this.opts.dailyHour &&
      now.getMinutes() === 0 &&
      this.lastDailyRun !== today
    ) {
      this.lastDailyRun = today;
      await this.opts.onDaily();
    }

    if (
      now.getDay() === this.opts.weeklyDay &&
      now.getHours() === this.opts.dailyHour &&
      now.getMinutes() === 0 &&
      this.lastWeeklyRun !== weekKey
    ) {
      this.lastWeeklyRun = weekKey;
      await this.opts.onWeekly();
    }
  }
}
