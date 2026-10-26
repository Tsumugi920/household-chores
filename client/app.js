// 前端入口：导航切换、概览统计、完成记录页；各功能在 js/ 模块中
import * as members from './js/members.js';
import * as chores from './js/chores.js';
import * as points from './js/points.js';
import * as calendar from './js/calendar.js';
import { LogsAPI, StatsAPI } from './js/api.js';
import {
  bus, escapeHtml, logIcon, fmtDateTime, toast,
} from './js/utils.js';

let activeTab = 'dashboard';
let refreshTimer = null;

// ---------- 导航 ----------
const RENDERERS = {
  dashboard: renderDashboard,
  chores: () => chores.render(),
  members: () => members.render(),
  points: () => points.render(),
  calendar: () => calendar.render(),
  logs: renderLogs,
};

function switchTab(name) {
  activeTab = name;
  document.querySelectorAll('#nav button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${name}`);
  });
  renderActive();
}

function renderActive() {
  Promise.resolve(RENDERERS[activeTab]()).catch((err) => console.error('[render]', err));
}

// members.render() 先行，刷新供其他模块使用的成员缓存
async function renderAll() {
  await members.render().catch(() => {});
  renderActive();
}

// ---------- 概览 ----------
async function renderDashboard() {
  const [stats, activity] = await Promise.all([
    StatsAPI.get(),
    LogsAPI.list('?limit=8'),
  ]);

  const cards = [
    ['👨‍👩‍👧‍👦 家庭成员', stats.members, ''],
    ['🧺 待完成任务', stats.pending, stats.pending > 0 ? 'warn' : 'ok'],
    ['📅 逾期任务', stats.overdue, stats.overdue > 0 ? 'warn' : 'ok'],
    ['✅ 已完成任务', stats.done, 'ok'],
    ['🔥 本周完成', stats.weekCompletions, 'accent'],
    ['⭐ 积分总量', stats.totalPoints, 'accent'],
  ];
  document.getElementById('stat-cards').innerHTML = cards
    .map(([label, num, cls]) => `
      <div class="stat-card ${cls}">
        <div class="stat-num">${num}</div>
        <div class="stat-label">${label}</div>
      </div>`).join('');

  const memberRows = stats.byMember.map((m, i) => {
    const total = m.doneCount + m.pending;
    const pct = total ? Math.round((m.doneCount / total) * 100) : 0;
    return `
      <div class="lb-row">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-avatar" style="background:${m.color}22">${escapeHtml(m.avatar)}</span>
        <div class="lb-main">
          <div class="lb-name">${escapeHtml(m.name)} <span class="muted small">⭐ ${m.points} 分 · 待办 ${m.pending}</span></div>
          <div class="lb-bar"><div class="lb-bar-fill" style="width:${pct}%;background:${m.color}"></div></div>
        </div>
        <span class="lb-points">${pct}%</span>
      </div>`;
  }).join('');
  document.getElementById('dash-members').innerHTML =
    memberRows || '<p class="muted">暂无成员</p>';

  const max = Math.max(1, ...stats.last7days.map((d) => d.count));
  document.getElementById('dash-trend').innerHTML = stats.last7days
    .map((d) => `
      <div class="trend-col">
        <div class="trend-bar" style="height:${Math.max(4, (d.count / max) * 100)}%"><span>${d.count || ''}</span></div>
        <span class="trend-label">${d.label}</span>
      </div>`).join('');

  document.getElementById('dash-activity').innerHTML = activity.length
    ? activity.map(logRow).join('')
    : '<p class="muted">还没有动态，去完成一项家务吧！</p>';
}

// ---------- 完成记录 ----------
function logRow(log) {
  const points = log.points
    ? ` · <b class="${log.points > 0 ? 'up' : 'down'}">${log.points > 0 ? '+' : ''}${log.points} 分</b>`
    : '';
  return `
    <div class="log-row">
      <span class="log-icon">${logIcon(log.type)}</span>
      <div class="log-main">
        <div class="log-msg">${escapeHtml(log.message)}</div>
        <div class="log-time">${fmtDateTime(log.createdAt)}${points}</div>
      </div>
    </div>`;
}

async function renderLogs() {
  const type = document.getElementById('log-type').value;
  const memberId = document.getElementById('log-member').value;
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (memberId) params.set('memberId', memberId);
  params.set('limit', '100');

  const logs = await LogsAPI.list(`?${params.toString()}`);
  const list = document.getElementById('log-list');
  list.innerHTML = logs.length
    ? logs.map(logRow).join('')
    : '<p class="muted" style="padding:12px 0">没有符合条件的记录。</p>';

  // 成员筛选下拉随成员列表刷新
  const select = document.getElementById('log-member');
  const current = select.value;
  select.innerHTML = '<option value="">全部成员</option>'
    + members.getMembers()
      .map((m) => `<option value="${m.id}">${escapeHtml(m.avatar)} ${escapeHtml(m.name)}</option>`)
      .join('');
  if (current) select.value = current;
}

// ---------- 启动 ----------
function init() {
  document.getElementById('nav').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (btn) switchTab(btn.dataset.tab);
  });

  members.init();
  chores.init();
  points.init();
  calendar.init();

  document.getElementById('log-type').addEventListener('change', () => renderLogs());
  document.getElementById('log-member').addEventListener('change', () => renderLogs());

  // 任何模块写入成功后统一刷新
  bus.addEventListener('data-changed', () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      renderAll().catch((err) => {
        console.error('[refresh]', err);
        toast('刷新数据失败，请检查后端服务', 'error');
      });
    }, 120);
  });

  renderAll().catch(() => toast('无法连接后端服务（http://localhost:3016）', 'error'));
}

init();
