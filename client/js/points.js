// 积分模块：排行榜 + 手动加减分
import { PointsAPI } from './api.js';
import { getMembers } from './members.js';
import { escapeHtml, toast, notifyChanged } from './utils.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export async function render() {
  const board = await PointsAPI.leaderboard();
  renderBoard(board);
  renderAdjustSelect();
}

function renderBoard(board) {
  const wrap = document.getElementById('leaderboard');
  if (!board.length) {
    wrap.innerHTML = '<p class="muted">还没有成员，先去「成员」页添加吧。</p>';
    return;
  }
  const max = Math.max(1, ...board.map((r) => r.points));
  wrap.innerHTML = board.map((row) => `
    <div class="lb-row ${row.rank <= 3 ? `lb-top${row.rank}` : ''}">
      <span class="lb-rank">${MEDALS[row.rank - 1] || row.rank}</span>
      <span class="lb-avatar" style="background:${row.color}22">${escapeHtml(row.avatar)}</span>
      <div class="lb-main">
        <div class="lb-name">${escapeHtml(row.name)} <span class="muted small">完成 ${row.doneCount} 次</span></div>
        <div class="lb-bar"><div class="lb-bar-fill" style="width:${Math.max(3, (row.points / max) * 100)}%;background:${row.color}"></div></div>
      </div>
      <span class="lb-points">${row.points} 分</span>
    </div>`).join('');
}

function renderAdjustSelect() {
  const select = document.getElementById('adjust-member');
  const current = select.value;
  select.innerHTML = getMembers()
    .map((m) => `<option value="${m.id}">${escapeHtml(m.avatar)} ${escapeHtml(m.name)}（${m.points} 分）</option>`)
    .join('');
  if (current && getMembers().some((m) => m.id === current)) select.value = current;
}

export function init() {
  document.getElementById('adjust-form').addEventListener('submit', onSubmit);
}

async function onSubmit(e) {
  e.preventDefault();
  const memberId = document.getElementById('adjust-member').value;
  const amount = Number(document.getElementById('adjust-amount').value);
  const reason = document.getElementById('adjust-reason').value.trim();
  if (!memberId) {
    toast('请选择要调整的成员', 'error');
    return;
  }
  if (!Number.isInteger(amount) || amount === 0) {
    toast('积分变化必须是非 0 整数（可为负）', 'error');
    return;
  }
  const result = await PointsAPI.adjust({ memberId, amount, reason: reason || undefined });
  toast(`已为「${result.member.name}」${amount > 0 ? '+' : ''}${amount} 分`, 'success');
  document.getElementById('adjust-amount').value = '';
  document.getElementById('adjust-reason').value = '';
  notifyChanged();
}
