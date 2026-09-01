export type ModerationResult = "ALLOW" | "REJECT" | "REVIEW";
export type PostType = "image" | "video";
export type PostStatus =
  | "draft"
  | "moderation"
  | "published"
  | "rejected"
  | "deleted";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "MEDIA_NOT_READY"
  | "MEDIA_REJECTED"
  | "MODERATION_PENDING"
  | "MODERATION_REJECTED"
  | "VIDEO_TOO_LONG"
  | "TOO_MANY_IMAGES"
  | "INVALID_MEDIA_TYPE"
  | "INTERNAL_ERROR";
