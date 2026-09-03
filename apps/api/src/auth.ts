import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import type { AppBindings } from "./types";

const buildSocialProviders = (env: AppBindings) => ({
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
    ? {
        apple: {
          clientId: env.APPLE_CLIENT_ID,
          clientSecret: env.APPLE_CLIENT_SECRET,
        },
      }
    : {}),
});

export const createAuth = (env: AppBindings) =>
  betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: buildSocialProviders(env),
    trustedOrigins: env.TRUSTED_ORIGINS
      ? env.TRUSTED_ORIGINS.split(",").map((origin) => origin.trim())
      : [],
    plugins: [expo()],
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
  });
