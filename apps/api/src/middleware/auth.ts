import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const mode = c.env.AUTH_MODE;

  if (mode === "dev") {
    const userId = c.req.header("x-dev-user-id");

    if (!userId) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "x-dev-user-id is required in dev auth mode",
          },
        },
        401,
      );
    }

    c.set("userId", userId);
    await next();
    return;
  }

  return c.json(
    {
      error: {
        code: "AUTH_NOT_CONFIGURED",
        message: "Authentication is not configured",
      },
    },
    503,
  );
};
