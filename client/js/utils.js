// 前端公共工具：事件总线、格式化、提示、两段式删除确认

// 数据变更事件总线：任何模块写入成功后 notifyChanged()，app.js 统一刷新
export const bus = new EventTarget();

export function notifyChanged() {
  bus.dispatchEvent(new CustomEvent('data-changed'));
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function fmtLocalDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr() {
  return fmtLocalDate();
}

// 'YYYY-MM-DD' → '10 月 26 日'
export function fmtCNDate(dateStr) {
  if (!dateStr) return '未设置截止';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m} 月 ${d} 日`;
}

// ISO 时间戳 → '10月25日 19:05'
export function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// 距离截止日还有几天（负数表示已逾期）
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - base) / 86400000);
}

export function dueInfo(chore) {
  if (chore.status === 'done') return { label: '已完成', cls: 'ok' };
  const diff = daysUntil(chore.dueDate);
  if (diff === null) return { label: '无截止', cls: 'muted' };
  if (diff < 0) return { label: `逾期 ${-diff} 天`, cls: 'danger' };
  if (diff === 0) return { label: '今天截止', cls: 'warn' };
  if (diff === 1) return { label: '明天截止', cls: 'warn' };
  return { label: `${diff} 天后截止`, cls: 'muted' };
}

export function rotationLabel(r) {
  return { none: '不轮换', daily: '每日轮换', weekly: '每周轮换' }[r] || '不轮换';
}

const LOG_ICONS = { complete: '✅', adjust: '⭐', undo: '↩️', member: '👨‍👩‍👧' };
export function logIcon(type) {
  return LOG_ICONS[type] || '📌';
}

export function toast(message, type = 'info') {
  const wrap = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = `toast${type === 'info' ? '' : ` toast-${type}`}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

export function memberChip(member) {
  if (!member) return '<span class="chip chip-unassigned">❓ 未分配</span>';
  return `<span class="chip" style="--chip:${member.color}"><span class="chip-avatar">${escapeHtml(member.avatar)}</span>${escapeHtml(member.name)}</span>`;
}

// 两段式删除确认：第一次点击变红提示，3 秒内再点才真正删除（避免原生 confirm 阻塞）
export function armConfirm(button, text = '确认删除？') {
  if (button.dataset.armed === '1') {
    button.dataset.armed = '';
    return true;
  }
  button.dataset.armed = '1';
  button.dataset.original = button.textContent;
  button.textContent = text;
  button.classList.add('danger-armed');
  setTimeout(() => {
    if (!button.isConnected || button.dataset.armed !== '1') return;
    button.dataset.armed = '';
    button.textContent = button.dataset.original;
    button.classList.remove('danger-armed');
  }, 3000);
  return false;
}
