export type AppBindings = {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  AI: Ai;
  STREAM: StreamBinding;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  TRUSTED_ORIGINS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_CLIENT_SECRET?: string;
};

export type AppVariables = {
  userId: string;
};

export type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};
