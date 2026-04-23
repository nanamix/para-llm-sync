// src/ui/StatusBar.ts

export class StatusBar {
  private el: HTMLElement;

  constructor(statusBarEl: HTMLElement) {
    this.el = statusBarEl;
    this.el.setText("PARA LLM Sync: 대기 중");
  }

  setRunning(provider: string): void {
    this.el.setText(`PARA LLM Sync: ${provider} 처리 중...`);
  }

  setDone(created: number, skipped: number): void {
    const now = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    this.el.setText(`PARA LLM Sync: ${now} 완료 (생성 ${created}건, 스킵 ${skipped}건)`);
  }

  setError(message: string): void {
    this.el.setText(`PARA LLM Sync: 오류 — ${message}`);
  }
}
