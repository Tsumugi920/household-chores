// 重置示例数据：把 server/data.json 覆盖为内置示例数据。
// 用法：npm run reset:data（建议先停止服务再执行）
const fs = require('fs');
const path = require('path');
const { buildSeedData } = require('./seed');

const file = path.join(__dirname, 'data.json');
const data = buildSeedData();
fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log(
  `已重置 ${file}：${data.members.length} 位成员、${data.chores.length} 项任务、${data.logs.length} 条记录`
);
