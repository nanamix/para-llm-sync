// src/core/WikiWriter.ts
import type { App } from "obsidian";
import type { LLMResponse } from "../types";
import { FOLDER_MAP } from "../types";

export class FileNamer {
  static next(existingPaths: string[], folder: string, title: string): string {
    const folderName = folder.split("/").pop() ?? folder;
    const nums = existingPaths
      .filter((p) => p.includes(folderName + "/"))
      .map((p) => {
        const base = p.split("/").pop() ?? "";
        const m = base.match(/^(\d+)_/);
        return m ? parseInt(m[1]) : 0;
      });
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const pad = String(next).padStart(2, "0");
    const slug = title.replace(/\s+/g, "-").replace(/[^\w가-힣\-]/g, "");
    return `${pad}_${slug}.md`;
  }
}

export class FrontmatterBuilder {
  static build(opts: { date: string; tags: string[]; status: string }): string {
    const tagLines = opts.tags.map((t) => `  - ${t}`).join("\n");
    return [
      "---",
      `created: ${opts.date}`,
      `updated: ${opts.date}`,
      `tags:\n  - wiki\n${tagLines}`,
      `status: ${opts.status}`,
      "source: para-llm-sync",
      "---",
    ].join("\n");
  }
}

export class WikiWriter {
  constructor(private app: App, private wikiPath: string) {}

  async write(
    response: LLMResponse,
    sourceNote: { path: string; date: string },
    provider: string
  ): Promise<string | null> {
    if (response.classification === "noise") return null;

    const folder = FOLDER_MAP[response.classification];
    const folderPath = `${this.wikiPath}/${folder}`;

    await this.ensureFolder(folderPath);

    const existingFiles = this.app.vault
      .getFiles()
      .map((f) => f.path)
      .filter((p) => p.startsWith(folderPath + "/"));

    const filename = FileNamer.next(existingFiles, folderPath, response.title);
    const filePath = `${folderPath}/${filename}`;

    const frontmatter = FrontmatterBuilder.build({
      date: sourceNote.date,
      tags: response.tags,
      status: "active",
    });

    const backlinksSection = response.backlinks.length
      ? `\n\n## 출처\n${response.backlinks.join("\n")}`
      : "";

    const body = `${frontmatter}\n\n# ${response.title}\n\n${response.summary}${backlinksSection}\n`;

    await this.app.vault.create(filePath, body);
    return filePath;
  }

  private async ensureFolder(path: string): Promise<void> {
    const adapter = this.app.vault.adapter;
    const exists = await adapter.exists(path);
    if (!exists) {
      await this.app.vault.createFolder(path);
      await this.app.vault.create(
        `${path}/00_Index.md`,
        `# Index\n\n이 폴더는 para-llm-sync가 자동 생성했습니다.\n`
      );
    }
  }
}

export class IndexUpdater {
  constructor(private app: App, private wikiPath: string) {}

  async appendToContentIndex(result: {
    filePath: string;
    classification: string;
    date: string;
  }): Promise<void> {
    const indexPath = `${this.wikiPath}/02_Content-Index.md`;
    const folder = result.filePath.split("/").slice(-2, -1)[0] ?? "";
    const filename = result.filePath.split("/").pop()?.replace(".md", "") ?? "";
    const row = `| ${filename} | ${folder} | ${result.date} | ${result.classification} | active |`;

    let file = this.app.vault.getAbstractFileByPath(indexPath);
    if (!file) {
      const header = "| 파일명 | 폴더 | 날짜 | 분류 | 상태 |\n|---|---|---|---|---|\n";
      await this.app.vault.create(indexPath, header + row + "\n");
      return;
    }
    const current = await this.app.vault.read(file as any);
    await this.app.vault.modify(file as any, current + "\n" + row);
  }

  async appendToOperationsLog(opts: {
    date: string;
    sources: string[];
    created: string[];
    skipped: number;
    provider: string;
  }): Promise<void> {
    const logPath = `${this.wikiPath}/03_Operations-Log.md`;
    const sourceLinks = opts.sources.map((s) => `  - [[${s}]]`).join("\n");
    const createdList = opts.created.length > 0
      ? opts.created.map((c) => `  - \`${c}\``).join("\n")
      : "  - (없음)";

    const entry = [
      `\n## [${opts.date}] AutoSync | Daily Digest 실행`,
      "",
      `- Sources:\n${sourceLinks}`,
      `- Created:\n${createdList}`,
      `- Skipped: ${opts.skipped}건 (noise)`,
      `- Provider: ${opts.provider}`,
    ].join("\n");

    let file = this.app.vault.getAbstractFileByPath(logPath);
    if (!file) {
      await this.app.vault.create(logPath, `# Operations Log\n${entry}\n`);
      return;
    }
    const current = await this.app.vault.read(file as any);
    const firstSection = current.indexOf("\n## ");
    if (firstSection === -1) {
      await this.app.vault.modify(file as any, current + entry);
    } else {
      const updated = current.slice(0, firstSection) + entry + "\n" + current.slice(firstSection);
      await this.app.vault.modify(file as any, updated);
    }
  }
}
