import { Hono } from "hono";
import { dbHealthRoutes } from "./routes/db-health";
import { healthRoutes } from "./routes/health";

const app = new Hono<{ Bindings: Env }>();

app.route("/health", healthRoutes);
app.route("/health/db", dbHealthRoutes);

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
