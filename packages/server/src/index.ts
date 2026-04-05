import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.text("hello world");
});

export { app };
export default app;
