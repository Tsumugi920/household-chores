// 日历模块：按月查看任务截止分布，点选日期查看当天任务并可直接打卡
import { ChoresAPI } from './api.js';
import { getMembers, findMember } from './members.js';
import {
  escapeHtml, toast, notifyChanged, memberChip, fmtCNDate, fmtLocalDate, todayStr,
} from './utils.js';

const WEEK_HEADS = ['一', '二', '三', '四', '五', '六', '日'];
let view = { y: new Date().getFullYear(), m: new Date().getMonth() + 1 };
let selectedDate = todayStr();

export async function render() {
  const chores = await ChoresAPI.list();
  renderTitle();
  renderGrid(chores);
  renderDetail(chores);
}

function renderTitle() {
  document.getElementById('cal-title').textContent = `${view.y} 年 ${view.m} 月`;
}

// 以周一为一周起点，生成覆盖当月的 6×7 格子
function buildCells() {
  const first = new Date(view.y, view.m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(view.y, view.m - 1, 1 - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      dateStr: fmtLocalDate(d),
      inMonth: d.getMonth() + 1 === view.m,
    });
  }
  return cells;
}

function renderGrid(chores) {
  const grid = document.getElementById('calendar-grid');
  const today = todayStr();
  const byDate = {};
  chores.forEach((c) => {
    if (!c.dueDate) return;
    (byDate[c.dueDate] = byDate[c.dueDate] || []).push(c);
  });

  grid.innerHTML = WEEK_HEADS.map((h) => `<div class="cal-head">${h}</div>`).join('')
    + buildCells().map((cell) => {
      const dayChores = byDate[cell.dateStr] || [];
      const shown = dayChores.slice(0, 3);
      const more = dayChores.length - shown.length;
      const chips = shown.map((c) => {
        const member = findMember(c.assignee);
        return `<span class="cal-chip ${c.status === 'done' ? 'done' : ''}" style="--chip:${member ? member.color : '#999'}" title="${escapeHtml(c.title)}">${escapeHtml((member ? member.avatar : '❓') + ' ' + c.title)}</span>`;
      }).join('');
      const cls = [
        'cal-cell',
        cell.inMonth ? '' : 'out',
        cell.dateStr === today ? 'today' : '',
        cell.dateStr === selectedDate ? 'selected' : '',
      ].filter(Boolean).join(' ');
      return `<div class="${cls}" data-date="${cell.dateStr}">
        <div class="cal-date">${Number(cell.dateStr.slice(8))}</div>
        ${chips}
        ${more > 0 ? `<span class="cal-more">还有 ${more} 项…</span>` : ''}
      </div>`;
    }).join('');
}

function renderDetail(chores) {
  const dayChores = chores
    .filter((c) => c.dueDate === selectedDate)
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'done' ? 1 : -1));
  document.getElementById('cal-detail-title').textContent =
    `${selectedDate.slice(0, 4)} 年 ${fmtCNDate(selectedDate)} · ${dayChores.length} 项任务`;
  const list = document.getElementById('cal-detail-list');
  if (!dayChores.length) {
    list.innerHTML = '<p class="muted">这一天没有安排任务。</p>';
    return;
  }
  list.innerHTML = dayChores.map((c) => {
    const isDone = c.status === 'done';
    return `<div class="cal-detail-row ${isDone ? 'is-done' : ''}">
      <span style="font-size:20px">${escapeHtml(c.icon || '🧹')}</span>
      <div class="chore-main">
        <div class="chore-title">${escapeHtml(c.title)} <span class="points-badge">+${c.points} 分</span></div>
        <div class="chore-meta">${memberChip(findMember(c.assignee))}${isDone ? '<span class="chip chip-ok">✅ 已完成</span>' : ''}</div>
      </div>
      <span class="cal-detail-spacer"></span>
      ${isDone
        ? `<button class="btn small" data-cal-reopen="${c.id}">↩️ 撤销</button>`
        : `<button class="btn small primary" data-cal-done="${c.id}" ${c.assignee ? '' : 'disabled'}>✅ 打卡</button>`}
    </div>`;
  }).join('');
}

export function init() {
  document.getElementById('cal-prev').addEventListener('click', () => shiftMonth(-1));
  document.getElementById('cal-next').addEventListener('click', () => shiftMonth(1));
  document.getElementById('cal-today').addEventListener('click', () => {
    const now = new Date();
    view = { y: now.getFullYear(), m: now.getMonth() + 1 };
    selectedDate = todayStr();
    render();
  });
  document.getElementById('calendar-grid').addEventListener('click', (e) => {
    const cell = e.target.closest('[data-date]');
    if (!cell) return;
    selectedDate = cell.dataset.date;
    render();
  });
  document.getElementById('cal-detail-list').addEventListener('click', async (e) => {
    const doneBtn = e.target.closest('[data-cal-done]');
    if (doneBtn) {
      const result = await ChoresAPI.complete(doneBtn.dataset.calDone);
      toast(`🎉 ${result.member.name} 完成「${result.chore.title}」，+${result.chore.points} 积分`, 'success');
      notifyChanged();
      return;
    }
    const reopenBtn = e.target.closest('[data-cal-reopen]');
    if (reopenBtn) {
      await ChoresAPI.reopen(reopenBtn.dataset.calReopen);
      toast('已撤销完成记录', 'success');
      notifyChanged();
    }
  });
}

function shiftMonth(delta) {
  let { y, m } = view;
  m += delta;
  if (m < 1) { m = 12; y -= 1; }
  if (m > 12) { m = 1; y += 1; }
  view = { y, m };
  render();
}
