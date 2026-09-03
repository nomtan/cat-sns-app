import { Hono } from "hono";
import { createAuth } from "./auth";
import { breedRoutes } from "./routes/breeds";
import { catRoutes } from "./routes/cats";
import { dbHealthRoutes } from "./routes/db-health";
import { followRoutes } from "./routes/follows";
import { healthRoutes } from "./routes/health";
import { meRoutes } from "./routes/me";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.all("/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

app.route("/health", healthRoutes);
app.route("/health/db", dbHealthRoutes);

app.route("/api/v1/breeds", breedRoutes);
app.route("/api/v1/cats", catRoutes);
app.route("/api/v1/cats", followRoutes);
app.route("/api/v1/me", meRoutes);

app.get("/api/v1", (c) =>
  c.json({
    data: {
      name: "Cat SNS API",
      version: "v1",
    },
  }),
);

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
      },
    },
    404,
  ),
);

app.onError((error, c) => {
  console.error(error);

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
    500,
  );
});

export default app;
