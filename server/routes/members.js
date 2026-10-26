// 成员路由：增删改查，列表附带任务统计
const express = require('express');
const store = require('../store');
const { newId, addLog, badRequest, notFound } = require('../helpers');

const router = express.Router();

// 成员列表（附带待办数与历史完成次数）
router.get('/', (req, res) => {
  const data = store.getData();
  const members = data.members.map((m) => ({
    ...m,
    assigned: data.chores.filter((c) => c.assignee === m.id && c.status === 'pending').length,
    doneCount: data.logs.filter((l) => l.type === 'complete' && l.memberId === m.id).length,
  }));
  res.json(members);
});

router.get('/:id', (req, res) => {
  const data = store.getData();
  const member = data.members.find((m) => m.id === req.params.id);
  if (!member) return notFound(res, '成员不存在');
  res.json(member);
});

router.post('/', (req, res) => {
  const data = store.getData();
  const { name, avatar, color } = req.body || {};
  if (!name || !String(name).trim()) return badRequest(res, '请填写成员姓名');
  const member = {
    id: newId('m'),
    name: String(name).trim().slice(0, 12),
    avatar: String(avatar || '🙂').slice(0, 4),
    color: /^#[0-9a-fA-F]{6}$/.test(String(color)) ? color : '#4f7df9',
    points: 0,
    createdAt: new Date().toISOString(),
  };
  data.members.push(member);
  addLog(data, {
    type: 'member',
    memberId: member.id,
    memberName: member.name,
    points: 0,
    message: `新成员「${member.name}」加入了家庭`,
  });
  store.save();
  res.status(201).json(member);
});

router.put('/:id', (req, res) => {
  const data = store.getData();
  const member = data.members.find((m) => m.id === req.params.id);
  if (!member) return notFound(res, '成员不存在');
  const { name, avatar, color } = req.body || {};
  if (name !== undefined) {
    if (!String(name).trim()) return badRequest(res, '成员姓名不能为空');
    member.name = String(name).trim().slice(0, 12);
  }
  if (avatar !== undefined) member.avatar = String(avatar).slice(0, 4) || '🙂';
  if (color !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(color))) member.color = color;
  store.save();
  res.json(member);
});

router.delete('/:id', (req, res) => {
  const data = store.getData();
  const idx = data.members.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return notFound(res, '成员不存在');
  const [member] = data.members.splice(idx, 1);
  // 名下任务转为未分配，历史完成记录保留（记录里存的是姓名快照）
  let unassigned = 0;
  data.chores.forEach((c) => {
    if (c.assignee === member.id) {
      c.assignee = null;
      unassigned += 1;
    }
  });
  addLog(data, {
    type: 'member',
    memberId: null,
    memberName: member.name,
    points: 0,
    message: `成员「${member.name}」被移除，其名下 ${unassigned} 项任务待重新分配`,
  });
  store.save();
  res.json({ ok: true, unassigned });
});

module.exports = router;
