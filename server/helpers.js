// 后端公共工具：id 生成、日期处理、完成记录、轮换与统一错误响应

const ROTATION_LABELS = { none: '不轮换', daily: '每日轮换', weekly: '每周轮换' };

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function fmtLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 'YYYY-MM-DD' 加减天数，返回 'YYYY-MM-DD'（本地时区）
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return fmtLocalDate(dt);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 写入一条记录（完成 / 调分 / 成员变动等），消息为快照，成员或任务删除后历史仍可读
function addLog(data, entry) {
  const log = { id: newId('l'), createdAt: new Date().toISOString(), ...entry };
  data.logs.push(log);
  return log;
}

// 轮换：取成员列表中的下一位成员
function nextMemberId(data, currentId) {
  const ids = data.members.map((m) => m.id);
  if (!ids.length) return null;
  const i = ids.indexOf(currentId);
  return ids[(i < 0 ? 0 : i + 1) % ids.length];
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function notFound(res, message = '资源不存在') {
  return res.status(404).json({ error: message });
}

module.exports = {
  ROTATION_LABELS,
  newId,
  fmtLocalDate,
  addDays,
  DATE_RE,
  addLog,
  nextMemberId,
  badRequest,
  notFound,
};
