import type {
  ModerationInput,
  ModerationOutput,
  ModerationService,
} from "./types";

export class MockModerationService implements ModerationService {
  async moderate(input: ModerationInput): Promise<ModerationOutput> {
    if (input.clientDecision === "ALLOW") {
      return { decision: "ALLOW", stage: "client" };
    }

    if (input.clientDecision === "REJECT") {
      return {
        decision: "REJECT",
        stage: "client",
        reason: input.reason ?? "Rejected by lightweight moderation",
      };
    }

    // Local development default: REVIEW is approved so the full posting flow
    // can be exercised before Workers AI is configured.
    return {
      decision: "ALLOW",
      stage: "mock-review",
      reason: "REVIEW resolved by local mock moderation",
    };
  }
}
