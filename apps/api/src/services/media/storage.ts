export type MediaUploadTarget = {
  key: string;
  method: "PUT";
  uploadUrl: string;
};

export interface MediaStorage {
  createKey(input: {
    userId: string;
    mediaSessionId: string;
    itemId: string;
    mimeType?: string;
  }): string;

  put(input: {
    key: string;
    body: ReadableStream | ArrayBuffer;
    contentType?: string;
  }): Promise<void>;

  exists(key: string): Promise<boolean>;

  delete(key: string): Promise<void>;
}

const extensionFromMimeType = (mimeType?: string) => {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
    case "image/heif":
      return "heic";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
};

export class R2MediaStorage implements MediaStorage {
  constructor(private readonly bucket: R2Bucket) {}

  createKey(input: {
    userId: string;
    mediaSessionId: string;
    itemId: string;
    mimeType?: string;
  }) {
    const extension = extensionFromMimeType(input.mimeType);
    return `uploads/${input.userId}/${input.mediaSessionId}/${input.itemId}.${extension}`;
  }

  async put(input: {
    key: string;
    body: ReadableStream | ArrayBuffer;
    contentType?: string;
  }) {
    await this.bucket.put(input.key, input.body, {
      httpMetadata: input.contentType
        ? {
            contentType: input.contentType,
          }
        : undefined,
    });
  }

  async exists(key: string) {
    return (await this.bucket.head(key)) !== null;
  }

  async delete(key: string) {
    await this.bucket.delete(key);
  }
}
