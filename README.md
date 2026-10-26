# household-chores 家庭家务管家

一个前后端分离的家庭家务管理系统，用来给全家分工做家务并发积分奖励：

- **成员管理**：家庭成员增删改查，每人有头像、主题色、积分
- **家务任务**：新增 / 编辑 / 删除任务，指派成员，支持 **每日 / 每周轮换**（打卡后自动转给下一位成员并顺延截止日期），逾期任务高亮
- **完成打卡**：一键打卡完成，自动给对应成员加分并写入完成记录，可撤销
- **积分奖励**：完成任务得积分，支持手动加减分，实时排行榜
- **完成记录**：全部完成 / 调分 / 成员变动记录，可按类型和成员筛选
- **日历视图**：按月查看任务截止分布，点选某天查看当天任务并可直接打卡
- **统计概览**：待办 / 逾期 / 本周完成数、成员贡献、近 7 天完成趋势

## 目录结构

```
household-chores/
├── package.json              # npm 配置（npm start 启动）
├── README.md
├── server/                   # 后端 Node + Express
│   ├── index.js              # 入口，端口 3016，同时托管前端静态文件
│   ├── store.js              # data.json 读写（启动时不存在则自动写入示例数据）
│   ├── seed.js               # 内置示例数据：4 位成员、20 项家务、14 条记录
│   ├── helpers.js            # 公共工具：id 生成、日志、日期、错误响应
│   ├── reset-data.js         # 一键重置回示例数据（npm run reset:data）
│   └── routes/
│       ├── members.js        # 成员增删改查
│       ├── chores.js         # 家务任务增删改查 + 完成打卡 / 撤销
│       ├── points.js         # 积分排行榜 + 手动加减分
│       └── logs.js           # 完成记录查询
└── client/                   # 前端原生 ES Module，无构建步骤
    ├── index.html
    ├── style.css
    ├── app.js                # 入口：导航、概览统计、完成记录页
    └── js/
        ├── api.js            # REST 请求封装
        ├── utils.js          # 公共工具：事件总线、格式化、toast
        ├── members.js        # 成员模块
        ├── chores.js         # 家务任务模块（筛选 / 新增 / 打卡）
        ├── points.js         # 积分排行与手动调分模块
        └── calendar.js       # 日历视图模块
```

## 环境要求

- Node.js >= 16（开发环境使用 Node 22 验证）

## 安装与启动

```bash
cd household-chores
npm install
npm start
```

启动后浏览器打开 **<http://localhost:3016>** 即可使用（后端同时托管前端页面，无需单独起前端服务）。

- 端口固定为 **3016**，如需修改可用环境变量 `PORT` 覆盖：`PORT=4000 npm start`
- 停止服务：在启动终端按 `Ctrl+C`

## 数据持久化

- 所有数据保存在 **server/data.json**，首次启动时自动写入内置示例数据（4 位成员、20 项家务任务、14 条完成 / 调分记录，日期相对"今天"生成）。
- 想恢复到干净的示例数据：`npm run reset:data`（会覆盖 data.json，请先停止服务）。

## REST API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/members` | 成员列表（附带待办 / 完成统计） |
| POST | `/api/members` | 新增成员 `{ name, avatar?, color? }` |
| PUT | `/api/members/:id` | 修改成员信息 |
| DELETE | `/api/members/:id` | 删除成员（名下任务转为未分配，历史记录保留） |
| GET | `/api/chores` | 任务列表，支持 `?assignee=&status=` 过滤 |
| POST | `/api/chores` | 新增任务 `{ title, icon?, description?, assignee?, rotation?, points?, dueDate? }` |
| PUT | `/api/chores/:id` | 修改任务 |
| DELETE | `/api/chores/:id` | 删除任务 |
| POST | `/api/chores/:id/complete` | **完成打卡** `{ memberId? }`（缺省为任务指派人）；轮换任务自动转给下一位成员并顺延截止日 |
| POST | `/api/chores/:id/reopen` | 撤销完成，扣回该任务积分 |
| GET | `/api/points/leaderboard` | 积分排行榜（含完成次数） |
| POST | `/api/points/adjust` | 手动加减分 `{ memberId, amount, reason? }`（amount 为非 0 整数） |
| GET | `/api/logs` | 完成记录查询，支持 `?type=&memberId=&limit=` |
| GET | `/api/stats` | 概览统计（待办 / 逾期 / 本周完成 / 成员贡献 / 近 7 天趋势） |

### curl 示例

```bash
# 列出成员
curl -s http://localhost:3016/api/members

# 新增任务
curl -s -X POST http://localhost:3016/api/chores \
  -H 'Content-Type: application/json' \
  -d '{"title":"擦拭餐桌","icon":"🧽","assignee":"m1","rotation":"none","points":8}'

# 完成打卡（把 <id> 换成上一步返回的任务 id）
curl -s -X POST http://localhost:3016/api/chores/<id>/complete \
  -H 'Content-Type: application/json' -d '{}'

# 积分排行榜 / 完成记录
curl -s http://localhost:3016/api/points/leaderboard
curl -s 'http://localhost:3016/api/logs?limit=5'
```

## 页面主流程演示

1. 打开 <http://localhost:3016>，「概览」页可看到待办、逾期、本周完成与近 7 天趋势。
2. 切到「家务任务」→ 点「＋ 新增任务」→ 填写名称、指派成员、设置截止日期与积分 → 保存。
3. 在任务列表点「✅ 打卡完成」→ 对应成员自动加分，生成完成记录；轮换任务会自动转给下一位。
4. 切到「积分」查看排行榜变化，也可在右侧手动加减分。
5. 「日历」按月查看任务截止分布；「记录」可按类型 / 成员筛选全部动态。
