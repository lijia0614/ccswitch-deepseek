// 多会话 reasoning_content 记忆与补回
// 每个会话独立队列，通过 previous_response_id 链式追踪

const sessions = new Map();        // sessionKey -> queue[]
const responseToSession = new Map(); // responseId -> sessionKey
const MAX_QUEUE_LEN = 20;         // 每会话最多缓存 20 条 reasoning

export function sessionKey(body) {
  // 通过 previous_response_id 链式查找已有会话
  const prevId = body?.previous_response_id;
  if (prevId && responseToSession.has(prevId)) {
    return responseToSession.get(prevId);
  }
  // 新会话
  return "sess_" + Math.random().toString(36).slice(2, 10);
}

// 将 response ID 与会话绑定（首次响应后调用）
export function linkResponse(key, responseId) {
  if (key && responseId) {
    responseToSession.set(responseId, key);
  }
}

export function rememberReasoning(key, messages) {
  if (!key) return;
  if (!sessions.has(key)) sessions.set(key, []);
  const queue = sessions.get(key);
  for (const msg of messages) {
    if (msg.role === "assistant" && msg.reasoning_content) {
      queue.push(msg.reasoning_content);
      // 防止内存无限增长
      if (queue.length > MAX_QUEUE_LEN) queue.shift();
    }
  }
}

export function recoverReasoning(key, messages) {
  if (!key || !sessions.has(key)) return 0;
  const queue = sessions.get(key);
  if (queue.length === 0) return 0;
  let recovered = 0;
  for (const msg of messages) {
    if (msg.role === "assistant" && msg.tool_calls && !msg.reasoning_content) {
      msg.reasoning_content = queue[Math.min(recovered, queue.length - 1)];
      recovered++;
    }
  }
  return recovered;
}

// 清理已完成会话（长时间运行避免内存泄漏）
export function cleanupSession(key) {
  sessions.delete(key);
  // 清理反向映射
  for (const [respId, sessKey] of responseToSession) {
    if (sessKey === key) responseToSession.delete(respId);
  }
}

// 定期清理：删除超过 1 小时未使用的会话
export function pruneStale() {
  // 简化实现：清空所有会话（对本地单用户代理足够安全）
  // 正式实现可用 LRU 或 TTL
  if (sessions.size > 100) {
    const keys = [...sessions.keys()].slice(0, 50);
    for (const k of keys) cleanupSession(k);
  }
}
