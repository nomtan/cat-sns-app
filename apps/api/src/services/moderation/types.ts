export type ModerationDecision = "ALLOW" | "REJECT" | "REVIEW";

export type ModerationInput = {
  mediaType: "image" | "video_frame";
  mediaId: string;
  storageKey?: string;
  mimeType?: string;
  clientDecision: ModerationDecision;
  clientScores?: Record<string, number>;
  reason?: string;
};

export type ModerationOutput = {
  decision: Exclude<ModerationDecision, "REVIEW">;
  stage: "client" | "mock-review" | "workers-ai";
  reason?: string;
  model?: string;
};

export interface ModerationService {
  moderate(input: ModerationInput): Promise<ModerationOutput>;
}
