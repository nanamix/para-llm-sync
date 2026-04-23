import type { App, TFile } from "obsidian";
import type { CollectedNote } from "../types";

export class NoteCollector {
  constructor(
    private app: App,
    private journalPath: string,
    private maxNotes: number
  ) {}

  async collectJournal(fromDate: string, toDate: string): Promise<CollectedNote[]> {
    const files = this.app.vault.getFiles() as TFile[];
    const journalFiles = files
      .filter((f) => f.path.startsWith(this.journalPath + "/"))
      .filter((f) => {
        const dateMatch = f.basename.match(/^(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) return false;
        const date = dateMatch[1];
        return date >= fromDate && date <= toDate;
      })
      .sort((a, b) => b.basename.localeCompare(a.basename))
      .slice(0, this.maxNotes);

    const notes: CollectedNote[] = [];
    for (const file of journalFiles) {
      const content = await this.app.vault.read(file);
      const dateMatch = file.basename.match(/^(\d{4}-\d{2}-\d{2})/);
      notes.push({
        path: file.path,
        content,
        date: dateMatch ? dateMatch[1] : file.basename,
      });
    }
    return notes;
  }
}
