// 成员模块：成员卡片列表 + 添加/编辑/删除
import { MembersAPI } from './api.js';
import { escapeHtml, toast, notifyChanged, armConfirm } from './utils.js';

let members = [];
let editingId = null;

const grid = () => document.getElementById('member-grid');
const dialog = () => document.getElementById('member-dialog');

// 供其他模块复用的成员缓存
export function getMembers() {
  return members;
}

export function findMember(id) {
  return members.find((m) => m.id === id) || null;
}

export async function render() {
  members = await MembersAPI.list();
  const el = grid();
  if (!members.length) {
    el.innerHTML = '<p class="muted">还没有家庭成员，点击右上角「＋ 添加成员」开始吧。</p>';
    return;
  }
  el.innerHTML = members.map((m) => `
    <div class="member-card card" style="--member:${m.color}">
      <div class="member-avatar">${escapeHtml(m.avatar)}</div>
      <div class="member-info">
        <div class="member-name">${escapeHtml(m.name)}</div>
        <div class="member-meta">
          <span class="points-badge">⭐ ${m.points} 积分</span>
          <span class="muted">待办 ${m.assigned} 项 · 完成 ${m.doneCount} 次</span>
        </div>
      </div>
      <div class="member-actions">
        <button class="btn small" data-edit="${m.id}">编辑</button>
        <button class="btn small danger" data-del="${m.id}">删除</button>
      </div>
    </div>`).join('');
}

export function init() {
  document.getElementById('btn-add-member').addEventListener('click', () => openDialog());
  document.getElementById('member-cancel').addEventListener('click', () => dialog().close());
  document.getElementById('member-form').addEventListener('submit', onSubmit);
  grid().addEventListener('click', onGridClick);
}

function openDialog(member) {
  editingId = member ? member.id : null;
  document.getElementById('member-dialog-title').textContent = member ? '编辑成员' : '添加成员';
  document.getElementById('member-name').value = member ? member.name : '';
  document.getElementById('member-avatar').value = member ? member.avatar : '🙂';
  document.getElementById('member-color').value = member ? member.color : '#4f7df9';
  dialog().showModal();
}

async function onSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('member-name').value.trim();
  if (!name) {
    toast('请填写成员姓名', 'error');
    return;
  }
  const payload = {
    name,
    avatar: document.getElementById('member-avatar').value.trim() || '🙂',
    color: document.getElementById('member-color').value,
  };
  if (editingId) {
    await MembersAPI.update(editingId, payload);
    toast('成员信息已更新', 'success');
  } else {
    const created = await MembersAPI.create(payload);
    toast(`成员「${created.name}」已加入`, 'success');
  }
  dialog().close();
  notifyChanged();
}

async function onGridClick(e) {
  const editBtn = e.target.closest('[data-edit]');
  if (editBtn) {
    openDialog(members.find((m) => m.id === editBtn.dataset.edit));
    return;
  }
  const delBtn = e.target.closest('[data-del]');
  if (delBtn && armConfirm(delBtn)) {
    const member = members.find((m) => m.id === delBtn.dataset.del);
    await MembersAPI.remove(member.id);
    toast(`已删除成员「${member.name}」`, 'success');
    notifyChanged();
  }
}
