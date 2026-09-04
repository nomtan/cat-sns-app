export type MediaUploadTarget = {
  key: string;
  method: "PUT";
  uploadUrl: string;
};

export interface MediaStorage {
  createUploadTarget(input: {
    userId: string;
    mediaSessionId: string;
    itemId: string;
    mimeType?: string;
  }): Promise<MediaUploadTarget>;
}

export class LocalMediaStorage implements MediaStorage {
  async createUploadTarget(input: {
    userId: string;
    mediaSessionId: string;
    itemId: string;
  }): Promise<MediaUploadTarget> {
    const key = `local/${input.userId}/${input.mediaSessionId}/${input.itemId}`;

    return {
      key,
      method: "PUT",
      uploadUrl: `local://${key}`,
    };
  }
}
