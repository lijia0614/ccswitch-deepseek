// SSE 翻译器单元测试 — 验证 Chat Completions SSE -> Responses API SSE 事件流
import { test } from "node:test";
import assert from "node:assert/strict";
import { SseTranslator } from "./lib/sse.js";

function mockRes() {
  const events = [];
  const res = {
    written: [],
    write(data) { this.written.push(data); return true; },
    end() {},
    headersSent: false,
    writeHead(code, headers) { this.headersSent = true; }
  };
  // 截获 emit 调用
  return { res, events };
}

test("SSE - response.created on first delta", () => {
  const { res } = mockRes();
  const t = new SseTranslator(res);
  t.feed({ choices: [{ delta: { content: "hello" } }] });
  const out = res.written.join("");
  assert.ok(out.includes("response.created"));
  assert.ok(out.includes("response.in_progress"));
  assert.ok(t.started);
});

test("SSE - output_text delta events", () => {
  const { res } = mockRes();
  const t = new SseTranslator(res);
  t.feed({ choices: [{ delta: { content: "Hello" } }] });
  t.feed({ choices: [{ delta: { content: " world" } }] });
  t.done({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });

  const out = res.written.join("");
  assert.ok(out.includes("response.output_item.added"));
  assert.ok(out.includes("response.content_part.added"));
  assert.ok(out.includes("response.output_text.delta"));
  assert.ok(out.includes("response.output_text.done"));
  assert.ok(out.includes("response.output_item.done"));
  assert.ok(out.includes("response.completed"));
  assert.equal(t.contentSoFar, "Hello world");
});

test("SSE - reasoning_text events", () => {
  const { res } = mockRes();
  const t = new SseTranslator(res);
  t.feed({ choices: [{ delta: { reasoning_content: "Let me think..." } }] });
  t.done(null);

  const out = res.written.join("");
  assert.ok(out.includes('"type":"reasoning"'));
  assert.ok(out.includes("response.reasoning_text.delta"));
  assert.ok(out.includes("response.reasoning_text.done"));
  assert.equal(t.reasoningSoFar, "Let me think...");
});

test("SSE - interleaved text and reasoning", () => {
  const { res } = mockRes();
  const t = new SseTranslator(res);
  t.feed({ choices: [{ delta: { reasoning_content: "Hmm" } }] });
  t.feed({ choices: [{ delta: { content: "Answer" } }] });
  t.done(null);

  const out = res.written.join("");
  // 应该有 reasoning item + message item
  const addedEvents = out.match(/response\.output_item\.added/g);
  assert.ok(addedEvents.length >= 2, "expected at least 2 output_item.added events");
  assert.ok(out.includes('"type":"reasoning"'));
  assert.ok(out.includes('"type":"message"'));
});

test("SSE - function call tool events", () => {
  const { res } = mockRes();
  const t = new SseTranslator(res);
  // Use JSON-serialized chunks to avoid escape issues
  const arg1 = '{"city"';
  const arg2 = ':"Beijing"}';
  t.feed({ choices: [{ delta: { tool_calls: [{ index: 0, id: "call_123", function: { name: "get_weather", arguments: arg1 } }] } }] });
  t.feed({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: arg2 } }] } }] });
  t.done(null);

  const out = res.written.join("");
  assert.ok(out.includes("response.function_call_arguments.delta"));
  assert.ok(out.includes("response.function_call_arguments.done"));
  assert.ok(out.includes('"type":"function_call"'));
  // 验证 arguments 拼接完整
  let allArgs = "";
  for (const [, call] of t.toolCalls) allArgs += call.arguments;
  assert.equal(allArgs, '{"city":"Beijing"}');
});

test("SSE - usage in response.completed", () => {
  const { res } = mockRes();
  const t = new SseTranslator(res);
  t.feed({ choices: [{ delta: { content: "hi" } }], usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } });
  t.done(null);

  const out = res.written.join("");
  assert.ok(out.includes('"input_tokens":5'));
  assert.ok(out.includes('"output_tokens":2'));
  assert.ok(out.includes('"total_tokens":7'));
});

test("SSE - empty delta does nothing", () => {
  const { res } = mockRes();
  const t = new SseTranslator(res);
  t.feed({ choices: [{ delta: {} }] });
  assert.equal(t.started, false);
  assert.equal(t.contentSoFar, "");
});

test("SSE - error event", () => {
  const { res } = mockRes();
  const t = new SseTranslator(res);
  t.error("test error");
  const out = res.written.join("");
  assert.ok(out.includes('"type":"error"'));
  assert.ok(out.includes("test error"));
});

test("SSE - done without any output still sends created+completed", () => {
  const { res } = mockRes();
  const t = new SseTranslator(res);
  t.done(null);
  const out = res.written.join("");
  assert.ok(out.includes("response.created"));
  assert.ok(out.includes("response.completed"));
});

console.log("\nSSE tests passed!");
