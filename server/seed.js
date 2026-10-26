// 内置示例数据生成器：4 位成员、20 项家务任务、14 条完成/调分记录。
// 所有日期相对"今天"生成，保证首次启动时示例数据总是贴近当前时间。
// 成员积分不是手写的，而是由示例记录累加得出，保证数据自洽。

function fmtLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateOffset(days) {
  return fmtLocalDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

// 若干天前的某个时刻（小时:分钟），返回 ISO 时间戳
function isoOffset(days, hour = 19, minute = 30) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function buildMembers() {
  return [
    { id: 'm1', name: '爸爸', avatar: '👨', color: '#4f7df9', points: 0, createdAt: isoOffset(-30, 9) },
    { id: 'm2', name: '妈妈', avatar: '👩', color: '#e8734a', points: 0, createdAt: isoOffset(-30, 9) },
    { id: 'm3', name: '哥哥', avatar: '👦', color: '#31a24c', points: 0, createdAt: isoOffset(-30, 9) },
    { id: 'm4', name: '妹妹', avatar: '👧', color: '#a55eea', points: 0, createdAt: isoOffset(-30, 9) },
  ];
}

// [标题, 图标, 描述, 指派成员, 轮换, 积分, 截止日偏移(天), 状态]
function buildChores() {
  const raw = [
    ['洗碗', '🧼', '晚餐后清洗并收纳碗筷', 'm1', 'daily', 10, 0, 'pending'],
    ['做晚餐', '🍳', '负责一家四口的晚餐', 'm2', 'daily', 15, 0, 'done'],
    ['倒垃圾', '🗑️', '分类打包并送到小区回收点', 'm3', 'daily', 5, 0, 'pending'],
    ['遛狗', '🐕', '早晚各遛一次小狗豆豆', 'm4', 'daily', 8, 0, 'pending'],
    ['扫地', '🧹', '客厅与走廊地面清扫', 'm1', 'weekly', 12, 1, 'pending'],
    ['拖地', '🪣', '全屋湿拖一遍', 'm1', 'weekly', 12, 1, 'pending'],
    ['洗衣服', '🧺', '深浅色分类洗涤并晾晒', 'm2', 'weekly', 12, 1, 'pending'],
    ['晾收衣物', '👕', '收取晾干的衣服并叠好放回', 'm2', 'none', 6, 1, 'pending'],
    ['整理客厅', '🛋️', '归位沙发抱枕、茶几与玩具', 'm3', 'weekly', 10, 2, 'pending'],
    ['清理卧室', '🛏️', '床铺整理与地面吸尘', 'm3', 'none', 15, 3, 'pending'],
    ['采购日用品', '🛒', '按清单补充纸巾、洗护与清洁用品', 'm2', 'weekly', 20, 2, 'pending'],
    ['擦窗户', '🪟', '客厅与卧室玻璃擦拭', 'm1', 'none', 25, 5, 'pending'],
    ['换床单', '🛌', '全家床单被套换洗', 'm4', 'weekly', 12, 4, 'pending'],
    ['清理冰箱', '🧊', '清理过期食材并擦拭隔板', 'm2', 'none', 18, 6, 'pending'],
    ['辅导作业', '📚', '陪妹妹完成当天作业并检查', 'm1', 'daily', 10, 0, 'pending'],
    ['取快递', '📦', '到驿站领取当天包裹', 'm4', 'none', 5, 0, 'done'],
    ['浇花施肥', '🪴', '阳台绿植浇水与施肥', 'm3', 'none', 6, 3, 'done'],
    ['清理宠物笼', '🐹', '仓鼠笼更换垫料并补充粮水', 'm3', 'daily', 8, 0, 'pending'],
    ['回收分类', '♻️', '纸箱瓶罐打包送去回收站', 'm1', 'none', 5, -1, 'pending'],
    ['整理玄关鞋柜', '👟', '鞋子归位并擦拭柜面', 'm4', 'none', 8, -2, 'pending'],
  ];
  const createdAgo = [-20, -19, -18, -18, -17, -17, -16, -15, -14, -14, -13, -12, -11, -10, -10, -9, -8, -7, -6, -5];
  return raw.map(([title, icon, description, assignee, rotation, points, due, status], i) => {
    const chore = {
      id: `c${i + 1}`,
      title,
      icon,
      description,
      assignee,
      rotation,
      points,
      dueDate: dateOffset(due),
      status,
      completedBy: null,
      completedByName: null,
      lastCompletedAt: null,
      createdAt: isoOffset(createdAgo[i], 10),
    };
    return chore;
  });
}

// [类型, 成员, 家务标题, 积分, 天偏移, 小时, 分钟, 备注]
function buildLogs(chores) {
  const raw = [
    ['complete', 'm2', '做晚餐', 15, 0, 19, 5],
    ['complete', 'm4', '取快递', 5, 0, 12, 40],
    ['complete', 'm3', '浇花施肥', 6, -1, 18, 20],
    ['complete', 'm1', '洗碗', 10, -1, 20, 10],
    ['adjust', 'm2', null, 20, -1, 21, 0, '本周家务全勤奖励'],
    ['complete', 'm2', '洗衣服', 12, -2, 15, 30],
    ['complete', 'm3', '整理客厅', 10, -2, 11, 0],
    ['complete', 'm4', '遛狗', 8, -2, 8, 30],
    ['complete', 'm1', '辅导作业', 10, -3, 19, 40],
    ['complete', 'm2', '做晚餐', 15, -3, 19, 5],
    ['complete', 'm1', '扫地', 12, -4, 17, 15],
    ['complete', 'm3', '清理宠物笼', 8, -4, 9, 0],
    ['adjust', 'm4', null, -5, -4, 20, 0, '忘记倒垃圾，扣分提醒'],
    ['complete', 'm2', '采购日用品', 20, -5, 14, 20],
  ];
  const members = buildMembers();
  return raw.map(([type, memberId, choreTitle, points, day, hour, minute, reason], i) => {
    const member = members.find((m) => m.id === memberId);
    const chore = choreTitle ? chores.find((c) => c.title === choreTitle) : null;
    let message;
    if (type === 'complete') {
      message = `${member.name} 完成了「${choreTitle}」，+${points} 积分`;
    } else {
      message = `${member.name} 的积分${points > 0 ? '增加' : '减少'} ${Math.abs(points)} 分：${reason}`;
    }
    return {
      id: `l${i + 1}`,
      type,
      memberId,
      memberName: member.name,
      choreId: chore ? chore.id : null,
      choreTitle: choreTitle || null,
      points,
      message,
      createdAt: isoOffset(day, hour, minute),
    };
  });
}

function buildSeedData() {
  const members = buildMembers();
  const chores = buildChores();
  // 与示例记录对齐：已完成的任务补上完成人与完成时间
  const doneInfo = { 做晚餐: ['m2', 0, 19, 5], 取快递: ['m4', 0, 12, 40], 浇花施肥: ['m3', -1, 18, 20] };
  chores.forEach((chore) => {
    const info = doneInfo[chore.title];
    if (chore.status === 'done' && info) {
      const [memberId, day, hour, minute] = info;
      const member = members.find((m) => m.id === memberId);
      chore.completedBy = memberId;
      chore.completedByName = member.name;
      chore.lastCompletedAt = isoOffset(day, hour, minute);
    }
  });
  const logs = buildLogs(chores);
  // 成员积分由记录累加得出，保证自洽
  members.forEach((m) => {
    m.points = logs
      .filter((l) => l.memberId === m.id)
      .reduce((sum, l) => sum + l.points, 0);
  });
  return { members, chores, logs };
}

module.exports = { buildSeedData };
