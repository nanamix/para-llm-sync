import { NoteCollector } from "../src/core/NoteCollector";

const mockApp = {
  vault: {
    getFiles: () => [
      { path: "9000_JOURNAL/2026/04/2026-04-23.md", basename: "2026-04-23" },
      { path: "9000_JOURNAL/2026/04/2026-04-22.md", basename: "2026-04-22" },
      { path: "9000_JOURNAL/2026/04/2026-04-16.md", basename: "2026-04-16" },
      { path: "1000_PROJECTS/some-project.md", basename: "some-project" },
    ],
    read: async (file: { path: string }) => `# ${file.path} 내용`,
  },
};

describe("NoteCollector", () => {
  it("오늘 저널만 수집한다 (Daily)", async () => {
    const collector = new NoteCollector(mockApp as any, "9000_JOURNAL", 20);
    const notes = await collector.collectJournal("2026-04-23", "2026-04-23");
    expect(notes).toHaveLength(1);
    expect(notes[0].path).toBe("9000_JOURNAL/2026/04/2026-04-23.md");
  });

  it("7일치 저널을 수집한다 (Weekly)", async () => {
    const collector = new NoteCollector(mockApp as any, "9000_JOURNAL", 20);
    const notes = await collector.collectJournal("2026-04-17", "2026-04-23");
    expect(notes).toHaveLength(2); // 2026-04-22, 2026-04-23만 범위 내
  });

  it("maxNotes 제한을 초과하지 않는다", async () => {
    const collector = new NoteCollector(mockApp as any, "9000_JOURNAL", 1);
    const notes = await collector.collectJournal("2026-04-01", "2026-04-30");
    expect(notes).toHaveLength(1);
  });
});
