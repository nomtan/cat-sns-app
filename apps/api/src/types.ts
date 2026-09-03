export type AppBindings = {
  DB: D1Database;
  AUTH_MODE?: "dev" | "clerk";
};

export type AppVariables = {
  userId: string;
};

export type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};
