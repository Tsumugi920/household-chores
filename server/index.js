// 服务入口：Express 提供 REST API 并托管 client/ 前端静态文件，端口 3016
const express = require('express');
const path = require('path');
const store = require('./store');
const { fmtLocalDate } = require('./helpers');
const membersRouter = require('./routes/members');
const choresRouter = require('./routes/chores');
const pointsRouter = require('./routes/points');
const logsRouter = require('./routes/logs');

const PORT = process.env.PORT || 3016;

store.load();

const app = express();
app.use(express.json());
// 前端静态资源（index.html / style.css / app.js / js/）
app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'household-chores', port: PORT }));

// 概览统计：待办 / 逾期 / 本周完成 / 成员贡献 / 近 7 天趋势
app.get('/api/stats', (req, res) => {
  const data = store.getData();
  const today = fmtLocalDate(new Date());
  const chores = data.chores;
  const pending = chores.filter((c) => c.status === 'pending');
  const done = chores.filter((c) => c.status === 'done');
  const overdue = pending.filter((c) => c.dueDate && c.dueDate < today);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  weekAgo.setHours(0, 0, 0, 0);
  const weekCompletions = data.logs.filter(
    (l) => l.type === 'complete' && new Date(l.createdAt) >= weekAgo
  ).length;

  const byMember = data.members
    .map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      color: m.color,
      points: m.points,
      pending: pending.filter((c) => c.assignee === m.id).length,
      doneCount: data.logs.filter((l) => l.type === 'complete' && l.memberId === m.id).length,
    }))
    .sort((a, b) => b.points - a.points);

  const last7days = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const date = fmtLocalDate(day);
    const count = data.logs.filter(
      (l) => l.type === 'complete' && fmtLocalDate(new Date(l.createdAt)) === date
    ).length;
    last7days.push({ date, label: date.slice(5), count });
  }

  res.json({
    members: data.members.length,
    choresTotal: chores.length,
    pending: pending.length,
    done: done.length,
    overdue: overdue.length,
    weekCompletions,
    totalPoints: data.members.reduce((sum, m) => sum + m.points, 0),
    byMember,
    last7days,
  });
});

app.use('/api/members', membersRouter);
app.use('/api/chores', choresRouter);
app.use('/api/points', pointsRouter);
app.use('/api/logs', logsRouter);

// 未匹配的 API 路径返回 404 JSON，而不是前端页面
app.use('/api', (req, res) => res.status(404).json({ error: `接口不存在：${req.method} ${req.originalUrl}` }));

// 统一错误处理：非法 JSON 请求体等
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求体不是合法的 JSON' });
  }
  console.error('[server] 未处理错误：', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🏠 household-chores 家庭家务管家已启动：http://localhost:${PORT}`);
});
