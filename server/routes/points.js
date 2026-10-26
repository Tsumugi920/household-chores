// 积分路由：排行榜 + 手动加减分
const express = require('express');
const store = require('../store');
const { addLog, badRequest } = require('../helpers');

const router = express.Router();

// 积分排行榜：按积分降序，平分时按完成次数
router.get('/leaderboard', (req, res) => {
  const data = store.getData();
  const board = data.members
    .map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      color: m.color,
      points: m.points,
      doneCount: data.logs.filter((l) => l.type === 'complete' && l.memberId === m.id).length,
    }))
    .sort((a, b) => b.points - a.points || b.doneCount - a.doneCount)
    .map((row, i) => ({ ...row, rank: i + 1 }));
  res.json(board);
});

// 手动加减分：amount 为非 0 整数，可为负
router.post('/adjust', (req, res) => {
  const data = store.getData();
  const { memberId, amount, reason } = req.body || {};
  const member = data.members.find((m) => m.id === memberId);
  if (!member) return badRequest(res, '请选择要调整的成员');
  const n = Number(amount);
  if (!Number.isInteger(n) || n === 0) return badRequest(res, '积分变化必须是非 0 整数');
  if (member.points + n < 0) return badRequest(res, `调整后积分不能为负（当前 ${member.points} 分）`);

  member.points += n;
  const log = addLog(data, {
    type: 'adjust',
    memberId,
    memberName: member.name,
    choreId: null,
    choreTitle: null,
    points: n,
    message: `${member.name} 的积分${n > 0 ? '增加' : '减少'} ${Math.abs(n)} 分${reason ? `：${String(reason).slice(0, 40)}` : ''}`,
  });
  store.save();
  res.json({ member, log });
});

module.exports = router;
