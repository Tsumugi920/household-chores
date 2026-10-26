// 完成记录路由：按类型 / 成员 / 条数查询
const express = require('express');
const store = require('../store');

const router = express.Router();

// GET /api/logs?type=complete|adjust|undo|member&memberId=m1&limit=50
router.get('/', (req, res) => {
  const data = store.getData();
  const { type, memberId } = req.query;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  let logs = [...data.logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (type) logs = logs.filter((l) => l.type === type);
  if (memberId) logs = logs.filter((l) => l.memberId === memberId);
  res.json(logs.slice(0, limit));
});

module.exports = router;
