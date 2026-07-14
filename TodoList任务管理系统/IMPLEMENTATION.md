# 功能实现细节与方法

本文档详细说明 TASK.OS 中每个核心功能的技术实现方式、数据流向和方法调用链。

---

## 目录

1. [新增任务](#1-新增任务)
2. [完成任务](#2-完成任务)
3. [删除任务](#3-删除任务)
4. [编辑任务](#4-编辑任务)
5. [筛选任务](#5-筛选任务)
6. [清空已完成](#6-清空已完成)
7. [撒花动画](#7-撒花动画)
8. [进度条](#8-进度条)
9. [Toast 通知](#9-toast-通知)
10. [输入框清空](#10-输入框清空)
11. [数据持久化](#11-数据持久化)
12. [时间格式化](#12-时间格式化)

---

## 1. 新增任务

### 交互入口
- 输入框按 `Enter`
- 点击右侧 `→` 按钮

### 方法调用链

```
用户按 Enter
  └→ ui.js: keydown 事件监听
       └→ handlers.onAdd(text)
            ├→ app.js: 先清空输入框（先清后加，避免 render 时 DOM 被清空）
            │   document.getElementById('taskInput').value = ''
            │   inp.dispatchEvent(new Event('input'))  ← 触发字符计数更新
            ├→ TaskManager.add(text)
            │   ├→ 验证 text.trim() 非空
            │   ├→ 构建任务对象
            │   │   {
            │   │     id: Storage.generateId()     ← "时间戳36进制 + 5位随机"
            │   │     text: trimmed,
            │   │     completed: false,
            │   │     createdAt: Date.now(),
            │   │     completedAt: null,
            │   │     deleted: false,
            │   │     deletedAt: null
            │   │   }
            │   └→ Storage.addTask(task)
            │       └→ tasks.unshift(task)  ← 头部插入
            │           └→ saveAll(tasks)  ← 写入 LocalStorage
            ├→ render()
            │   ├→ TaskManager.getFiltered()   ← 重新获取筛选后的列表
            │   ├→ TaskManager.getStats()      ← 重新计算统计数据
            │   └→ UI.renderList(tasks)        ← 重新渲染 DOM
            ├→ UI.highlightTask(id)
            │   └→ li.scrollIntoView()        ← 平滑滚动到新任务
            ├→ UI.animateAddTask(id)
            │   ├→ li.style.animation = 'none'
            │   ├→ void li.offsetWidth         ← 强制重排，刷新动画
            │   └→ li.classList.add('task-just-added')
            │       └→ CSS: 左侧滑入 + 橙色光晕
            ├→ UI.showToast('已添加 ✓', 'success')
            └→ setTimeout(2000ms)
                 ├→ UI.animateRemoveTask(id)
                 │   └→ li.classList.add('is-removing')
                 │       └→ CSS: 向右飞出淡出动画 (0.45s)
                 └→ setTimeout(450ms)
                      └→ TaskManager.permanentRemove(id)
                           ├→ Storage.permanentlyDeleteTask(id)
                           │   └→ tasks = tasks.filter(t => t.id !== id)
                           │       └→ saveAll(tasks)  ← 彻底抹除
                           └→ render()
```

### 关键代码位置
- 入口：`ui.js` 第 265~275 行
- 处理器：`app.js` `handlers.onAdd()`
- 数据层：`storage.js` `addTask()`
- 动画：`ui.js` `animateAddTask()`、`animateRemoveTask()`
- CSS：`style.css` `@keyframes taskEnter`、`@keyframes taskFlyOut`

---

## 2. 完成任务

### 交互入口
- 点击任务左侧圆形复选框

### 方法调用链

```
用户点击 checkbox
  └→ ui.js: taskList 事件委托（click）
       └→ handlers.onToggle(id)
            ├→ TaskManager.toggle(id)
            │   ├→ 查找任务 _tasks.find(t => t.id === id)
            │   ├→ 构建更新对象
            │   │   {
            │   │     completed: !task.completed,       ← 取反
            │   │     completedAt: !completed ? Date.now() : null
            │   │   }
            │   └→ Storage.updateTask(id, updates)
            │       └→ tasks.map(t => t.id === id ? {...t,...updates} : t)
            │           └→ saveAll(tasks)
            ├→ render()  ← 重新渲染列表和统计
            └→ if (updated.completed) {
                 ├→ UI.animateDoneTask(id)
                 │   └→ li.classList.add('just-done')
                 │       └→ CSS: 整体弹性缩放回弹
                 ├→ UI.triggerConfetti(id)
                 │   └→ spawnConfetti(x, y)  ← 撒花动画
                 └→ setTimeout(2000ms)
                      ├→ UI.animateRemoveTask(id)
                      │   └→ li.classList.add('is-removing')
                      └→ setTimeout(450ms)
                           └→ TaskManager.remove(id)
                                ├→ Storage.softDeleteTask(id)
                                │   └→ tasks.map(t =>
                                │        t.id === id ? {...t, deleted:true, deletedAt:Date.now()} : t
                                │     )
                                └→ render()
```

### 关键点
- `completedAt` 字段用于判断"今日完成"筛选
- 完成后 2 秒软删除（`deleted: true`），保留在 LocalStorage 历史中
- 撒花动画在 `animateDoneTask` 100ms 后触发，确保 DOM 已更新

---

## 3. 删除任务

### 交互入口
- 点击任务右侧 `✕` 按钮
- 行为根据当前筛选器决定

### 方法调用链

```
用户点击 ✕ 按钮
  └→ ui.js: taskList 事件委托
       └→ handlers.onDelete(id)
            ├→ TaskManager.findById(id)
            │
            ├→ if (TaskManager.getCurrentFilter() === 'completed') {
            │   // 在"已完成"栏删除 → 降级为未完成（无动画）
            │   ├→ TaskManager.demoteToActive(id)
            │   │   └→ Storage.updateTask(id, {
            │   │        completed: false,
            │   │        completedAt: null
            │   │     })
            │   │         └→ saveAll(tasks)
            │   ├→ render()
            │   └→ UI.showToast('已移至未完成', 'info')
            │        └→ 任务从"已完成"消失，保留在"全部"里
            │
            └→ } else {
                 // 在"全部"或"未完成"栏删除 → 永久删除
                 ├→ UI.animateRemoveTask(id)
                 │   └→ li.classList.add('is-removing')
                 │       └→ CSS: 向右飞出 (0.45s)
                 ├→ UI.showToast('已删除', 'warn')
                 └→ setTimeout(2000ms)
                      └→ TaskManager.permanentRemove(id)
                           ├→ Storage.permanentlyDeleteTask(id)
                           │   └→ tasks = tasks.filter(t => t.id !== id)
                           │       └→ saveAll(tasks)
                           └→ render()
```

### 三种删除场景对比

| 场景 | 筛选器 | Storage 操作 | 视觉效果 |
|------|--------|-------------|---------|
| 在"已完成"栏删除 | `completed` | `updateTask`（改状态）| 立即消失，无动画 |
| 在"全部"栏删除 | `all` | `filter` 彻底移除 | 飞走动画 2 秒后消失 |
| 在"未完成"栏删除 | `active` | `filter` 彻底移除 | 飞走动画 2 秒后消失 |

### 关键代码位置
- 入口：`ui.js` `bindEvents()` 中的 `action-btn--delete` 处理
- 处理器：`app.js` `handlers.onDelete()`
- 降级方法：`task.js` `demoteToActive()`
- 永久删除：`task.js` `permanentRemove()` → `Storage.permanentlyDeleteTask()`

---

## 4. 编辑任务

### 交互入口
- 双击任务文字区域
- 点击任务右侧 `✎` 按钮

### 方法调用链

#### 进入编辑
```
用户双击文字 / 点击编辑按钮
  └→ ui.js: taskList 事件委托
       └→ handlers.onEditStart(id)
            └→ UI.setEditing(id, true)
                 ├→ li.classList.add('is-editing')
                 │   └→ CSS: 边框变橙色，显示编辑输入框
                 ├→ input.focus()
                 ├→ input.select()       ← 文字全选
                 └→ textEl.classList.add('editing')
                      └→ CSS: 文字末尾显示闪烁光标 |
```

#### 保存编辑
```
用户按 Enter / 输入框失焦
  └→ ui.js: keydown (Enter) 或 blur
       └→ handlers.onEditConfirm(id, newText)
            ├→ newText.trim() 验证非空
            ├→ if (空) {
            │   ├→ UI.showError('内容不能为空')
            │   └→ UI.setEditing(id, false)
            │        └→ li.classList.remove('is-editing')
            │            └→ 恢复显示原始文字
            └→ } else {
                 ├→ TaskManager.updateText(id, newText)
                 │   └→ Storage.updateTask(id, { text: trimmed })
                 │       └→ saveAll(tasks)
                 ├→ UI.setEditing(id, false)
                 │   └→ li.classList.remove('is-editing')
                 ├→ UI.updateTaskText(id, updated.text)
                 │   ├→ textEl.textContent = text   ← 更新显示文字
                 │   └→ input.value = text         ← 同步编辑框
                 └→ UI.showToast('已更新 ✓', 'info')
```

#### 取消编辑
```
用户按 Esc
  └→ ui.js: keydown (Escape)
       └→ handlers.onEditCancel(id)
            ├→ TaskManager.findById(id)  ← 恢复原始数据
            └→ UI.setEditing(id, false)
            └→ UI.updateTaskText(id, task.text)
                 └→ 恢复为编辑前的原始文字
```

### 关键代码位置
- 进入编辑：`ui.js` `setEditing()`、`bindEvents()` 双击和点击处理
- 保存/取消：`ui.js `blur` 和 `keydown` 监听
- 处理器：`app.js` `handlers.onEditConfirm()`、`onEditCancel()`

---

## 5. 筛选任务

### 交互入口
- 点击筛选 Tab 按钮：`全部` / `未完成` / `已完成`

### 方法调用链

```
用户点击 Tab
  └→ ui.js: filterTabs 事件监听
       └→ handlers.onFilter(filter)
            ├→ TaskManager.setFilter(filter)  ← 保存当前筛选器
            └→ render()
                 ├→ TaskManager.getFiltered()
                 │   ├→ allTasks = Storage.getAll().filter(t => !t.deleted)
                 │   └→ switch (filter) {
                 │        case 'all':
                 │             return allTasks
                 │        case 'active':
                 │             return allTasks.filter(t => !t.completed)
                 │        case 'completed':
                 │             return getTodayCompleted()  ← 仅今天
                 │      }
                 ├→ UI.updateFilterTabs(filter)  ← Tab 高亮切换
                 ├→ UI.updateStats(stats)         ← 更新所有计数
                 │   ├→ countAll.textContent = stats.total
                 │   ├→ countActive.textContent = stats.active
                 │   ├→ countCompleted.textContent = stats.todayDone
                 │   ├→ statTotal.textContent = stats.total
                 │   ├→ statDone.textContent = stats.done
                 │   ├→ clearBtn.disabled = (done === 0)
                 │   └→ updateProgress(stats)
                 └→ UI.renderList(tasks)  ← 重新渲染列表 DOM
```

### "仅今天"筛选实现
```javascript
function getTodayCompleted() {
  const allTasks = Storage.getAll().filter(t => !t.deleted);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);  // 今天 00:00:00.000
  return allTasks.filter(t =>
    t.completed && t.completedAt >= startOfDay.getTime()
  );
}
```

### 关键代码位置
- Tab 切换：`ui.js` `bindEvents()` 中 `filterTabs.forEach`
- 筛选逻辑：`task.js` `getFiltered()`
- 今日筛选：`task.js` `getTodayCompleted()`
- UI 更新：`ui.js` `updateFilterTabs()`

---

## 6. 清空已完成

### 交互入口
- 点击筛选栏右侧 `清空已完成` 按钮

### 方法调用链

```
用户点击"清空已完成"按钮
  └→ ui.js: clearBtn click
       └→ confirm('确定要清空所有已完成的任务吗？')
            └→ if (confirm === true)
                 └→ handlers.onClearDone()
                      ├→ TaskManager.clearDone()
                      │   ├→ doneTasks = _tasks.filter(t => t.completed)
                      │   ├→ doneTasks.forEach(t =>
                      │   │    Storage.permanentlyDeleteTask(t.id)
                      │   │     └→ tasks = tasks.filter(t => t.id !== id)
                      │   │         └→ saveAll(tasks)  ← 每条逐一永久删除
                      │   └→ _tasks = Storage.getAll().filter(t => !t.deleted)
                      └→ render()
                           └→ UI.showToast('已清空 N 项已完成任务', 'warn')
```

### 关键代码位置
- 入口：`ui.js` `bindEvents()` 中 `clearBtn` 处理
- 处理器：`app.js` `handlers.onClearDone()`
- 核心：`task.js` `clearDone()` → `Storage.permanentlyDeleteTask()`

---

## 7. 撒花动画

### 实现原理

每次撒花不是用一个固定 CSS 动画，而是为每个粒子**动态生成独一无二的 `@keyframes`**：

```javascript
function spawnConfetti(x, y) {
  const colors = ['#f58230','#f5a030','#ffd166','#06d6a0',
                  '#118ab2','#ef476f','#8338ec','#ff6b6b'];
  const count = 14;

  for (let i = 0; i < count; i++) {
    // 1. 创建粒子 DOM
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';

    // 2. 计算随机物理参数
    const angle = Math.random() * 360 * (Math.PI / 180);
    const velocity = Math.random() * 160 + 80;
    const vx = Math.cos(angle) * velocity;  // 水平速度
    const vy = Math.sin(angle) * velocity - 60; // 垂直速度（含上扬偏移）

    // 3. 注入动态 @keyframes
    const pieceId = 'cf_' + Date.now() + '_' + i;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${pieceId} {
        0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
        100% { transform: translate(${vx}px, ${y+300}px)
                             rotate(${Math.random()*720-360}deg) scale(0.2); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // 4. 应用动画
    piece.style.animation = `${pieceId} 1.1s cubic-bezier(0.16,1,0.3,1) forwards`;

    // 5. 动画结束后自动清理（防止 DOM 泄漏）
    piece.addEventListener('animationend', () => {
      piece.remove();  // 移除粒子 DOM
      style.remove();   // 移除动态样式
    });

    // 6. 挂载到容器
    _els.confettiContainer.appendChild(piece);
  }
}
```

### 关键设计
- 每个粒子有独立 `animationId`，避免动画名冲突
- 坐标从任务卡片中心计算：`rect.left + rect.width / 2`
- 自动清理机制保证动画结束后无残留 DOM
- 容器固定在页面顶部 `position: fixed; top: 0; height: 0`

### 关键代码位置
- 入口：`app.js` `handlers.onToggle()` 中 `setTimeout(() => triggerConfetti(id), 100)`
- 核心函数：`ui.js` `spawnConfetti()`
- 触发函数：`ui.js` `triggerConfetti()`

---

## 8. 进度条

### 实现方式

纯 CSS 动画 + JS 数据驱动：

```javascript
function updateProgress(stats) {
  if (stats.total === 0) {
    _els.progressWrap.style.display = 'none';
    return;
  }
  _els.progressWrap.style.display = 'flex';

  // 计算百分比
  const pct = Math.round((stats.done / stats.total) * 100);

  // 驱动 DOM 更新（CSS transition 自动处理动画）
  _els.progressFill.style.width = pct + '%';
  _els.progressText.innerHTML = `<span>${pct}</span>%`;
}
```

```css
/* 进度条容器 */
.progress-bar {
  width: 120px;
  height: 4px;
  background: var(--border-subtle);
  border-radius: 4px;
  overflow: hidden;
}

/* 填充条 */
.progress-fill {
  height: 100%;
  width: 0%;              /* JS 动态更新此值 */
  background: linear-gradient(90deg, var(--accent), #f5a030);
  border-radius: 4px;
  transition: width .5s cubic-bezier(0.16,1,0.3,1); /* 平滑过渡 */
}

/* 高光流动效果 */
.progress-fill::after {
  content: '';
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 20px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6));
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### 调用时机
- 每次 `render()` → `UI.updateStats(stats)` → `updateProgress(stats)`
- 数据源：`TaskManager.getStats()` 返回 `{ total, done, active, todayDone }`

---

## 9. Toast 通知

### 实现方式

动态创建 DOM 节点，2.8 秒后自动移除：

```javascript
function showToast(message, type = 'success') {
  const icons = { success: '✓', error: '✕', warn: '!', info: 'i' };

  // 1. 创建 Toast 节点
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;

  // 2. 挂载到容器（固定在页面底部居中）
  _els.toastContainer.appendChild(toast);

  // 3. 限制最多 3 条（超出则移除最早的）
  const toasts = _els.toastContainer.querySelectorAll('.toast');
  if (toasts.length > 3) toasts[0].remove();

  // 4. 2.8 秒后触发离场动画
  _toastTimer = setTimeout(() => {
    toast.classList.add('is-leaving');  // 执行 CSS 离场动画
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2800);
}
```

### Toast 类型与样式

| 类型 | 图标 | 边框色 |
|------|------|--------|
| `success` | ✓ | 绿色 |
| `error` | ✕ | 红色 |
| `warn` | ! | 橙色 |
| `info` | i | 蓝色 |

### CSS 动画

```css
/* 入场 */
@keyframes toastEnter {
  from { opacity: 0; transform: translateY(20px) scale(0.85); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 离场 */
@keyframes toastLeave {
  to { opacity: 0; transform: translateY(-12px) scale(0.9); }
}

.toast { animation: toastEnter .4s cubic-bezier(0.34,1.56,0.64,1); }
.toast.is-leaving { animation: toastLeave .35s ease forwards; }
```

---

## 10. 输入框清空

### 问题背景

添加任务后需要清空输入框，但顺序很关键：
- `render()` 会重建整个任务列表 DOM
- 如果在 `render()` 之后清空，可能在重建过程中清空被重置

### 解决方案

**先清空，再添加，最后渲染**：

```javascript
onAdd(text) {
  // 第1步：先清空（DOM 操作在前）
  var inp = document.getElementById('taskInput');
  var raw = inp ? inp.value : text;   // 保存原始值
  inp && (inp.value = '');             // 清空输入框
  UI.updateCounter && UI.updateCounter(0);  // 更新计数

  // 第2步：添加任务（数据操作）
  var task = TaskManager.add(raw);

  // 第3步：渲染（此时输入框已清空，不会被影响）
  render();
}
```

### 字符计数更新

```javascript
// 输入时实时更新计数
_els.taskInput.addEventListener('input', () => {
  updateCounter(_els.taskInput.value.length);
});

// 清空时手动触发一次计数更新
inp.dispatchEvent(new Event('input'));
// 等价于: updateCounter(0)
```

---

## 11. 数据持久化

### LocalStorage 操作

```javascript
const KEY = 'taskos_data_v1';

// 读取（带容错）
function getAll() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];  // 首次使用返回空数组
  try {
    return JSON.parse(raw).tasks;
  } catch (e) {
    console.warn('数据损坏，自动重置');  // 防止恶意/损坏数据
    return [];
  }
}

// 写入
function saveAll(tasks) {
  localStorage.setItem(KEY, JSON.stringify({ tasks, version: 2 }));
}
```

### 唯一 ID 生成

```javascript
function generateId() {
  return Date.now().toString(36)              // 时间戳转36进制（紧凑）
       + Math.random().toString(36).slice(2, 7);  // 5位随机字符
}
// 示例: "m1abc234de_9xyz"
```

### 数据版本迁移

```javascript
// 读取时自动检测并升级旧版本数据
function _initData() {
  const data = JSON.parse(raw);
  if (!data.version) data.version = 2;   // 旧数据自动补版本号
  if (!Array.isArray(data.tasks)) data.tasks = [];
  data.tasks = data.tasks.filter(t => t.id); // 清理损坏任务
  return data;
}
```

---

## 12. 时间格式化

### 相对时间

```javascript
function formatTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = 60000, hour = 3600000, day = 86400000;

  if (diff < min)          return '刚刚';                        // < 1分钟
  if (diff < hour)         return `${Math.floor(diff/min)} 分钟前`;  // < 1小时
  if (diff < day)          return `${Math.floor(diff/hour)} 小时前`; // < 24小时
  if (diff < 2*day)        return '昨天';                         // < 2天
  return `${Math.floor(diff/day)} 天前`;                          // >= 2天
}
```

### 日期显示

```javascript
function formatDate() {
  const now = new Date();
  const days = ['周日','周一','周二','周三','周四','周五','周六'];
  return `${
    now.getFullYear()
  }.${pad(now.getMonth()+1)}.${pad(now.getDate())}  ${days[now.getDay()]}`;
  // 输出: "2026.04.01  周三"
}
```
