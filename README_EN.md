# ccswitch-deepseek

[中文](README.md)

---

Codex CLI -> DeepSeek proxy. Translates OpenAI Responses API to DeepSeek Chat Completions API.

## Quick Start

Install:

```bash
npm install
```

Edit `.env`:

```
api_key=sk-your-deepseek-api-key
```

Start (default port 11435, default model deepseek-v4-pro):

```bash
npm start
```

Custom config:

```bash
npm start -- --port 8080 --model deepseek-chat
```

## Files

| File | Description |
|------|-------------|
| `index.js` | HTTP server entry |
| `lib/log.js` | Colored logging |
| `lib/translate.js` | Input translation (Responses -> Chat), incl. multimodal |
| `lib/sse.js` | SSE event translation (Chat -> Responses) |
| `lib/recover.js` | reasoning_content per-session restore |
| `test_translate.js` | Translation unit tests |
| `test_sse.js` | SSE event translation unit tests |

## Translations

### Input (Responses -> Chat Completions)

- message items (`input_text` / `output_text` / `reasoning_text`)
- `function_call` -> assistant `tool_calls`
- `function_call_output` -> `tool` message
- `reasoning` items (skip, retain `reasoning_content`)
- `developer` role -> `system`
- `input_image` -> `image_url` (full multimodal support)
- `input_file` / `input_audio` -> skip with stats

### Output (Chat Completions -> Responses SSE)

- `response.created` / `in_progress` / `completed`
- `output_item.added` / `done`
- `output_text.delta` / `done` + `content_part.added` / `done`
- `reasoning_text.delta` / `done` + `content_part.added` / `done`
- `function_call_arguments.delta` / `done`
- `usage` (token stats) in `response.completed`

### Parameters

- `instructions` -> system message
- `temperature` / `top_p` / `max_output_tokens` passthrough
- `tools` / `tool_choice` translation
- `thinking` / `reasoning` -> DeepSeek thinking mode
- `reasoning_content` auto-restore (per-session isolation)

## Tests

```bash
npm run test
```

43 unit tests covering translation logic + SSE events.

## License

ISC

