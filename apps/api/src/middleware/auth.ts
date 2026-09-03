import type { MiddlewareHandler } from "hono";
import { createAuth } from "../auth";
import type { AppEnv } from "../types";

const ensureAppUser = async (
  db: D1Database,
  user: { id: string; email: string },
) => {
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT OR IGNORE INTO users (
        id,
        auth_user_id,
        email,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(user.id, user.id, user.email, now, now)
    .run();
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      },
      401,
    );
  }

  await ensureAppUser(c.env.DB, session.user);
  c.set("userId", session.user.id);
  await next();
};
