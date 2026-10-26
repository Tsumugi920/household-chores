// 家务任务模块：筛选（成员/状态）、列表、新增/编辑/删除、打卡完成与撤销
import { ChoresAPI } from './api.js';
import { getMembers, findMember } from './members.js';
import {
  escapeHtml, toast, notifyChanged, armConfirm, memberChip, dueInfo, rotationLabel, fmtCNDate, todayStr,
} from './utils.js';

let chores = [];
let filterMember = 'all';
let filterStatus = 'all';
let editingId = null;

const dialog = () => document.getElementById('chore-dialog');

export async function render() {
  chores = await ChoresAPI.list();
  renderFilters();
  renderList();
}

const STATUS_TABS = [
  ['all', '全部'],
  ['pending', '待完成'],
  ['overdue', '逾期'],
  ['done', '已完成'],
];

function renderFilters() {
  const members = getMembers();
  const bar = document.getElementById('chore-filters');
  const memberBtns = [{ id: 'all', name: '全部成员', avatar: '👨‍👩‍👧‍👦' }, ...members]
    .map((m) => `<button class="chip-filter ${filterMember === m.id ? 'active' : ''}" data-member="${m.id}">${escapeHtml(m.avatar)} ${escapeHtml(m.name)}</button>`)
    .join('');
  const statusBtns = STATUS_TABS
    .map(([id, label]) => `<button class="${filterStatus === id ? 'active' : ''}" data-status="${id}">${label}</button>`)
    .join('');
  bar.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap">${memberBtns}</div>
    <div class="segmented">${statusBtns}</div>`;
}

function matchesFilters(chore) {
  if (filterMember !== 'all' && chore.assignee !== filterMember) return false;
  if (filterStatus === 'all') return true;
  if (filterStatus === 'done') return chore.status === 'done';
  if (filterStatus === 'pending') return chore.status === 'pending';
  if (filterStatus === 'overdue') {
    return chore.status === 'pending' && chore.dueDate && chore.dueDate < todayStr();
  }
  return true;
}

function sortChores(a, b) {
  if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
  const da = a.dueDate || '9999-12-31';
  const db = b.dueDate || '9999-12-31';
  return da < db ? -1 : da > db ? 1 : 0;
}

function renderList() {
  const list = document.getElementById('chore-list');
  const visible = chores.filter(matchesFilters).sort(sortChores);
  const pending = chores.filter((c) => c.status === 'pending').length;
  const overdue = chores.filter((c) => c.status === 'pending' && c.dueDate && c.dueDate < todayStr()).length;
  document.getElementById('chore-summary').textContent =
    `共 ${chores.length} 项任务 · 待完成 ${pending} · 逾期 ${overdue} · 当前显示 ${visible.length} 项`;

  if (!visible.length) {
    list.innerHTML = '<div class="card muted">没有符合条件的任务，试试调整筛选或新增一项任务。</div>';
    return;
  }
  list.innerHTML = visible.map((chore) => {
    const member = findMember(chore.assignee);
    const due = dueInfo(chore);
    const isDone = chore.status === 'done';
    const overdueCls = !isDone && chore.dueDate && chore.dueDate < todayStr() ? 'is-overdue' : '';
    return `
    <div class="chore-card card ${overdueCls} ${isDone ? 'is-done' : ''}">
      <div class="chore-icon">${escapeHtml(chore.icon || '🧹')}</div>
      <div class="chore-main">
        <div class="chore-title">${escapeHtml(chore.title)} <span class="points-badge">+${chore.points} 分</span></div>
        ${chore.description ? `<div class="chore-desc muted">${escapeHtml(chore.description)}</div>` : ''}
        <div class="chore-meta">
          ${memberChip(member)}
          <span class="chip chip-due ${due.cls}">📅 ${fmtCNDate(chore.dueDate)} · ${due.label}</span>
          ${chore.rotation !== 'none' ? `<span class="chip">🔄 ${rotationLabel(chore.rotation)}</span>` : ''}
          ${isDone ? `<span class="chip chip-ok">✅ ${escapeHtml(chore.completedByName || '已完成')}</span>` : ''}
        </div>
      </div>
      <div class="chore-actions">
        ${isDone
          ? `<button class="btn small" data-reopen="${chore.id}" title="撤销完成并扣回积分">↩️ 撤销</button>`
          : `<button class="btn small primary" data-done="${chore.id}" ${chore.assignee ? '' : 'disabled title="请先编辑并指派成员"'}>✅ 打卡完成</button>`}
        <button class="btn small" data-edit="${chore.id}">编辑</button>
        <button class="btn small danger" data-del="${chore.id}">删除</button>
      </div>
    </div>`;
  }).join('');
}

export function init() {
  document.getElementById('btn-add-chore').addEventListener('click', () => openDialog());
  document.getElementById('chore-cancel').addEventListener('click', () => dialog().close());
  document.getElementById('chore-form').addEventListener('submit', onSubmit);
  document.getElementById('chore-filters').addEventListener('click', onFilterClick);
  document.getElementById('chore-list').addEventListener('click', onListClick);
}

function onFilterClick(e) {
  const memberBtn = e.target.closest('[data-member]');
  if (memberBtn) {
    filterMember = memberBtn.dataset.member;
    renderFilters();
    renderList();
    return;
  }
  const statusBtn = e.target.closest('[data-status]');
  if (statusBtn) {
    filterStatus = statusBtn.dataset.status;
    renderFilters();
    renderList();
  }
}

function fillAssigneeSelect(selected) {
  const select = document.getElementById('chore-assignee');
  const members = getMembers();
  select.innerHTML = '<option value="">暂不指派</option>'
    + members.map((m) => `<option value="${m.id}">${escapeHtml(m.avatar)} ${escapeHtml(m.name)}</option>`).join('');
  select.value = selected || '';
}

function openDialog(chore) {
  editingId = chore ? chore.id : null;
  document.getElementById('chore-dialog-title').textContent = chore ? '编辑任务' : '新增任务';
  fillAssigneeSelect(chore ? chore.assignee : '');
  document.getElementById('chore-title').value = chore ? chore.title : '';
  document.getElementById('chore-icon').value = chore ? (chore.icon || '🧹') : '🧹';
  document.getElementById('chore-desc').value = chore ? (chore.description || '') : '';
  document.getElementById('chore-rotation').value = chore ? chore.rotation : 'none';
  document.getElementById('chore-points').value = chore ? chore.points : 10;
  document.getElementById('chore-due').value = chore ? (chore.dueDate || '') : todayStr();
  dialog().showModal();
}

async function onSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('chore-title').value.trim();
  if (!title) {
    toast('请填写任务名称', 'error');
    return;
  }
  const payload = {
    title,
    icon: document.getElementById('chore-icon').value.trim() || '🧹',
    description: document.getElementById('chore-desc').value.trim(),
    assignee: document.getElementById('chore-assignee').value || null,
    rotation: document.getElementById('chore-rotation').value,
    points: Number(document.getElementById('chore-points').value) || 10,
    dueDate: document.getElementById('chore-due').value || null,
  };
  if (editingId) {
    await ChoresAPI.update(editingId, payload);
    toast('任务已更新', 'success');
  } else {
    const created = await ChoresAPI.create(payload);
    toast(`任务「${created.title}」已添加`, 'success');
  }
  dialog().close();
  notifyChanged();
}

async function onListClick(e) {
  const doneBtn = e.target.closest('[data-done]');
  if (doneBtn) {
    const result = await ChoresAPI.complete(doneBtn.dataset.done);
    toast(`🎉 ${result.member.name} 完成「${result.chore.title}」，+${result.chore.points} 积分`, 'success');
    notifyChanged();
    return;
  }
  const reopenBtn = e.target.closest('[data-reopen]');
  if (reopenBtn) {
    const result = await ChoresAPI.reopen(reopenBtn.dataset.reopen);
    toast(`已撤销「${result.chore.title}」的完成记录`, 'success');
    notifyChanged();
    return;
  }
  const editBtn = e.target.closest('[data-edit]');
  if (editBtn) {
    openDialog(chores.find((c) => c.id === editBtn.dataset.edit));
    return;
  }
  const delBtn = e.target.closest('[data-del]');
  if (delBtn && armConfirm(delBtn)) {
    const chore = chores.find((c) => c.id === delBtn.dataset.del);
    await ChoresAPI.remove(chore.id);
    toast(`已删除任务「${chore.title}」`, 'success');
    notifyChanged();
  }
}
