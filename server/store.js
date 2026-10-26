// 数据存储层：全部数据持久化在 server/data.json。
// 首次启动时文件不存在，则自动生成内置示例数据并写入。
const fs = require('fs');
const path = require('path');
const { buildSeedData } = require('./seed');

const DATA_FILE = path.join(__dirname, 'data.json');

let data = null;

function load() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (!data || !Array.isArray(data.members)) throw new Error('bad structure');
      console.log(`[store] 已加载 data.json：${data.members.length} 位成员、${data.chores.length} 项任务、${data.logs.length} 条记录`);
      return data;
    } catch (err) {
      console.error('[store] data.json 损坏，将重新生成示例数据：', err.message);
    }
  }
  data = buildSeedData();
  save();
  console.log(`[store] 已生成示例数据 data.json：${data.members.length} 位成员、${data.chores.length} 项任务、${data.logs.length} 条记录`);
  return data;
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getData() {
  return data;
}

module.exports = { load, save, getData, DATA_FILE };
