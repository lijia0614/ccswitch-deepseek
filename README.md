# ccswitch-deepseek

[English](README_EN.md)

---

让 Codex CLI 通过 DeepSeek 模型运行。

Codex 使用 OpenAI Responses API 协议，DeepSeek 只提供 Chat Completions API。本项目在本地启动一个协议翻译代理，在两者之间无缝转换。

## 快速开始

安装依赖：

```bash
npm install
```

编辑 `.env`：

```
api_key=sk-your-deepseek-api-key
```

启动（默认端口 11435，默认模型 deepseek-v4-pro）：

```bash
npm start
```

自定义配置：

```bash
npm start -- --port 8080 --model deepseek-chat
```

## 文件结构

| 文件 | 说明 |
|------|------|
| `index.js` | HTTP 服务主入口 |
| `lib/log.js` | 彩色日志工具 |
| `lib/translate.js` | 输入翻译 (Responses -> Chat)，含多模态 |
| `lib/sse.js` | SSE 事件翻译 (Chat -> Responses) |
| `lib/recover.js` | reasoning_content 多会话记忆与补回 |
| `test_translate.js` | 翻译逻辑单元测试 |
| `test_sse.js` | SSE 事件翻译单元测试 |

## 翻译覆盖

### 输入 (Responses -> Chat Completions)

- message items (`input_text` / `output_text` / `reasoning_text`)
- `function_call` -> assistant `tool_calls`
- `function_call_output` -> `tool` message
- `reasoning` items（跳过，保留 `reasoning_content`）
- `developer` role -> `system`
- `input_image` -> `image_url`（完整多模态支持）
- `input_file` / `input_audio` -> 跳过统计

### 输出 (Chat Completions -> Responses SSE)

- `response.created` / `in_progress` / `completed`
- `output_item.added` / `done`
- `output_text.delta` / `done` + `content_part.added` / `done`
- `reasoning_text.delta` / `done` + `content_part.added` / `done`
- `function_call_arguments.delta` / `done`
- `usage` token 统计（`response.completed` 中）

### 请求参数

- `instructions` -> system message
- `temperature` / `top_p` / `max_output_tokens` 透传
- `tools` / `tool_choice` 翻译
- `thinking` / `reasoning` -> DeepSeek thinking 模式
- `reasoning_content` 跨轮次自动补回（按会话隔离）

## 运行测试

```bash
npm run test
```

43 个单元测试，覆盖翻译逻辑 + SSE 事件流，不依赖网络。

## License

ISC

