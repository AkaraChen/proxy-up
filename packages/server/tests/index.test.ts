import app from "../src/index";
import { expect, test } from "vite-plus/test";

test("GET / returns hello world", async () => {
  const res = await app.request("/");
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("hello world");
});

test("GET / with custom headers", async () => {
  const req = new Request("http://localhost/", {
    headers: {
      "X-Custom-Header": "test-value",
    },
  });
  const res = await app.fetch(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("hello world");
});

test("POST / returns 404", async () => {
  const res = await app.request("/", { method: "POST" });
  expect(res.status).toBe(404);
});

test("GET /nonexistent returns 404", async () => {
  const res = await app.request("/nonexistent");
  expect(res.status).toBe(404);
});
