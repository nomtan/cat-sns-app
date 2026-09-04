import type {
  ModerationInput,
  ModerationOutput,
  ModerationService,
} from "./types";

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct" as const;

const bytesToBase64 = (bytes: Uint8Array) => {
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const parseDecision = (value: string): { decision: "ALLOW" | "REJECT"; reason?: string } => {
  const normalized = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const parsed = JSON.parse(normalized) as {
    decision?: string;
    reason?: string;
  };

  if (parsed.decision !== "ALLOW" && parsed.decision !== "REJECT") {
    throw new Error("Workers AI returned an invalid moderation decision");
  }

  return {
    decision: parsed.decision,
    reason: parsed.reason,
  };
};

export class WorkersAiModerationService implements ModerationService {
  constructor(
    private readonly ai: Ai,
    private readonly bucket: R2Bucket,
  ) {}

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

    if (input.mediaType !== "image") {
      throw new Error("Workers AI video moderation requires extracted image frames");
    }

    if (!input.storageKey || !input.mimeType) {
      throw new Error("Workers AI moderation requires storageKey and mimeType");
    }

    const object = await this.bucket.get(input.storageKey);
    if (!object) {
      throw new Error("Media object was not found in R2");
    }

    const bytes = new Uint8Array(await object.arrayBuffer());
    const image = `data:${input.mimeType};base64,${bytesToBase64(bytes)}`;

    const response = await this.ai.run(VISION_MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You moderate uploads for a real-cat-only social network. Return only valid JSON with decision ALLOW or REJECT and a concise reason. Do not use markdown.",
        },
        {
          role: "user",
          content: [
            "Review this image using these rules:",
            "ALLOW when a real living cat is visibly present, even with people, other animals, or when the cat is small in the image.",
            "REJECT when there is no real cat, or the cat is an illustration, AI-generated image, plush/toy, dead, abused, strongly bloody/gory, or visibly has a severe injury.",
            "When uncertain about whether a real cat is present or whether prohibited severe content is shown, choose REJECT.",
            'Respond exactly as JSON: {\"decision\":\"ALLOW\"|\"REJECT\",\"reason\":\"short reason\"}.',
          ].join("\n"),
        },
      ],
      image,
      max_tokens: 160,
      temperature: 0,
    });

    const responseText =
      typeof response === "object" && response && "response" in response
        ? String(response.response)
        : "";

    if (!responseText) {
      throw new Error("Workers AI returned an empty moderation response");
    }

    const result = parseDecision(responseText);

    return {
      decision: result.decision,
      stage: "workers-ai",
      reason: result.reason,
      model: VISION_MODEL,
    };
  }
}
