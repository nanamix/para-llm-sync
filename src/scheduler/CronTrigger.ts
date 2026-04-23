// src/scheduler/CronTrigger.ts

export interface CronOptions {
  dailyHour: number;
  weeklyDay: number;
  weeklyHour: number;
  onDaily: () => Promise<void>;
  onWeekly: () => Promise<void>;
}

export class CronTrigger {
  private intervalId: number | null = null;
  private lastDailyRun: string = "";
  private lastWeeklyRun: string = "";

  constructor(private opts: CronOptions) {}

  start(): void {
    if (this.intervalId !== null) return;
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
      // lastDailyRun은 호출 성공 여부와 무관하게 선행 갱신 (재진입 방지 의도)
      this.lastDailyRun = today;
      try {
        await this.opts.onDaily();
      } catch (err) {
        console.error("[CronTrigger] onDaily 실패:", err);
      }
    }

    if (
      now.getDay() === this.opts.weeklyDay &&
      now.getHours() === this.opts.weeklyHour &&
      now.getMinutes() === 0 &&
      this.lastWeeklyRun !== weekKey
    ) {
      this.lastWeeklyRun = weekKey;
      try {
        await this.opts.onWeekly();
      } catch (err) {
        console.error("[CronTrigger] onWeekly 실패:", err);
      }
    }
  }
}
