// src/core/PromotionPipeline.ts
import type { CollectedNote, PromotionResult } from "../types";
import type { LLMClient } from "./LLMClient";
import { PROMOTION_PROMPT, completeWithFallback } from "./LLMClient";
import type { WikiWriter, IndexUpdater } from "./WikiWriter";

export class PromotionPipeline {
  constructor(
    private chain: LLMClient[],
    private writer: WikiWriter,
    private indexUpdater: IndexUpdater
  ) {}

  async run(notes: CollectedNote[], runDate: string): Promise<PromotionResult> {
    const created: string[] = [];
    let skipped = 0;
    let lastProvider = "unknown";

    for (const note of notes) {
      const { response, provider } = await completeWithFallback(
        this.chain,
        PROMOTION_PROMPT,
        note.content
      );
      lastProvider = provider;

      const filePath = await this.writer.write(
        response,
        { path: note.path, date: note.date },
        provider
      );

      if (filePath) {
        created.push(filePath);
        await this.indexUpdater.appendToContentIndex({
          filePath,
          classification: response.classification,
          date: note.date,
        });
      } else {
        skipped++;
      }
    }

    await this.indexUpdater.appendToOperationsLog({
      date: runDate,
      sources: notes.map((n) => n.path),
      created,
      skipped,
      provider: lastProvider,
    });

    return { created, skipped, provider: lastProvider };
  }
}
