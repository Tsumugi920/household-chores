// 家务任务路由：增删改查 + 完成打卡 + 撤销完成（含轮换转派逻辑）
const express = require('express');
const store = require('../store');
const {
  newId, addLog, addDays, nextMemberId, badRequest, notFound, ROTATION_LABELS, DATE_RE,
} = require('../helpers');

const router = express.Router();
const ROTATIONS = Object.keys(ROTATION_LABELS);

function findChore(data, id) {
  return data.chores.find((c) => c.id === id);
}

// 校验任务字段，返回 { error } 或规范化后的值
function normalizeChorePayload(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.title !== undefined) {
    if (!body.title || !String(body.title).trim()) return { error: '请填写任务名称' };
    out.title = String(body.title).trim().slice(0, 20);
  }
  if (body.icon !== undefined) out.icon = String(body.icon).slice(0, 4) || '🧹';
  if (body.description !== undefined) out.description = String(body.description).slice(0, 60);
  if (body.assignee !== undefined) out.assignee = body.assignee || null;
  if (body.rotation !== undefined) {
    if (!ROTATIONS.includes(body.rotation)) return { error: '轮换方式不合法' };
    out.rotation = body.rotation;
  }
  if (body.points !== undefined) {
    const n = Number(body.points);
    if (!Number.isInteger(n) || n < 1 || n > 100) return { error: '积分必须是 1~100 的整数' };
    out.points = n;
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === '') out.dueDate = null;
    else if (!DATE_RE.test(String(body.dueDate))) return { error: '截止日期格式应为 YYYY-MM-DD' };
    else out.dueDate = body.dueDate;
  }
  return { value: out };
}

// 任务列表，支持 ?assignee=&status= 过滤
router.get('/', (req, res) => {
  const data = store.getData();
  let chores = data.chores;
  const { assignee, status } = req.query;
  if (assignee) chores = chores.filter((c) => c.assignee === assignee);
  if (status) chores = chores.filter((c) => c.status === status);
  res.json(chores);
});

router.get('/:id', (req, res) => {
  const data = store.getData();
  const chore = findChore(data, req.params.id);
  if (!chore) return notFound(res, '任务不存在');
  res.json(chore);
});

router.post('/', (req, res) => {
  const data = store.getData();
  const { error, value } = normalizeChorePayload(req.body || {});
  if (error) return badRequest(res, error);
  if (value.assignee) {
    const member = data.members.find((m) => m.id === value.assignee);
    if (!member) return badRequest(res, '指派的成员不存在');
  }
  const chore = {
    id: newId('c'),
    title: value.title,
    icon: value.icon || '🧹',
    description: value.description || '',
    assignee: value.assignee || null,
    rotation: value.rotation || 'none',
    points: value.points ?? 10,
    dueDate: value.dueDate || null,
    status: 'pending',
    completedBy: null,
    completedByName: null,
    lastCompletedAt: null,
    createdAt: new Date().toISOString(),
  };
  data.chores.push(chore);
  store.save();
  res.status(201).json(chore);
});

router.put('/:id', (req, res) => {
  const data = store.getData();
  const chore = findChore(data, req.params.id);
  if (!chore) return notFound(res, '任务不存在');
  const { error, value } = normalizeChorePayload(req.body || {}, { partial: true });
  if (error) return badRequest(res, error);
  if (value.assignee) {
    const member = data.members.find((m) => m.id === value.assignee);
    if (!member) return badRequest(res, '指派的成员不存在');
  }
  // 状态只能通过打卡 / 撤销接口变更，保证积分与记录一致
  Object.assign(chore, value);
  store.save();
  res.json(chore);
});

router.delete('/:id', (req, res) => {
  const data = store.getData();
  const idx = data.chores.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return notFound(res, '任务不存在');
  const [chore] = data.chores.splice(idx, 1);
  store.save();
  res.json({ ok: true, id: chore.id });
});

// 完成打卡：加分、写记录；轮换任务自动转给下一位成员并顺延截止日
router.post('/:id/complete', (req, res) => {
  const data = store.getData();
  const chore = findChore(data, req.params.id);
  if (!chore) return notFound(res, '任务不存在');
  if (chore.status === 'done') return badRequest(res, '该任务已完成，请先撤销再打卡');

  const memberId = (req.body && req.body.memberId) || chore.assignee;
  const member = memberId ? data.members.find((m) => m.id === memberId) : null;
  if (!member) return badRequest(res, '任务尚未指派成员，请先在编辑中指派或传入 memberId');

  chore.status = 'done';
  chore.completedBy = member.id;
  chore.completedByName = member.name;
  chore.lastCompletedAt = new Date().toISOString();

  let rotatedTo = null;
  if (chore.rotation && chore.rotation !== 'none' && data.members.length > 1) {
    rotatedTo = nextMemberId(data, chore.assignee);
    if (rotatedTo) {
      chore.assignee = rotatedTo;
      const step = chore.rotation === 'daily' ? 1 : 7;
      chore.dueDate = addDays(chore.dueDate || new Date().toISOString().slice(0, 10), step);
    }
  }

  member.points += chore.points;
  const log = addLog(data, {
    type: 'complete',
    memberId: member.id,
    memberName: member.name,
    choreId: chore.id,
    choreTitle: chore.title,
    points: chore.points,
    message: `${member.name} 完成了「${chore.title}」，+${chore.points} 积分${rotatedTo ? '，任务已轮换给下一位' : ''}`,
  });
  store.save();
  res.json({ chore, member, log });
});

// 撤销完成：扣回积分、写撤销记录
router.post('/:id/reopen', (req, res) => {
  const data = store.getData();
  const chore = findChore(data, req.params.id);
  if (!chore) return notFound(res, '任务不存在');
  if (chore.status !== 'done') return badRequest(res, '该任务尚未完成，无法撤销');

  const member = chore.completedBy ? data.members.find((m) => m.id === chore.completedBy) : null;
  if (member) member.points -= chore.points;

  chore.status = 'pending';
  chore.completedBy = null;
  chore.completedByName = null;
  chore.lastCompletedAt = null;

  const log = addLog(data, {
    type: 'undo',
    memberId: member ? member.id : null,
    memberName: member ? member.name : '未知成员',
    choreId: chore.id,
    choreTitle: chore.title,
    points: -chore.points,
    message: `${member ? member.name : '有人'} 撤销了「${chore.title}」的完成记录，-${chore.points} 积分`,
  });
  store.save();
  res.json({ chore, log });
});

module.exports = router;
