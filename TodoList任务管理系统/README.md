# TASK.OS — 任务管理系统

> 基于原生 JavaScript 的轻量级任务管理工具，采用模块化架构，数据完全存储于浏览器本地，无任何后端依赖。

---

## 目录

- [项目概览](#项目概览)
- [文件结构](#文件结构)
- [设计规范](#设计规范)
- [架构设计](#架构设计)
- [数据模型](#数据模型)
- [功能清单](#功能清单)
- [交互与动画](#交互与动画)
- [模块职责说明](#模块职责说明)
- [CSS 架构](#css-架构)
- [浏览器兼容性](#浏览器兼容性)

---

## 项目概览

| 项目 | 说明 |
|------|------|
| 名称 | TASK.OS |
| 类型 | 单页前端应用（SPA） |
| 技术栈 | 原生 HTML + CSS + JavaScript（ES5+）|
| 数据存储 | LocalStorage（浏览器本地持久化）|
| 部署方式 | 纯静态文件，直接打开 `index.html` 即可运行 |
| 无需依赖 | 无 npm、无框架、无构建工具 |

---

## 文件结构

```
桌面/TodoList/
├── index.html      # 主页面 HTML 结构
├── style.css       # 全部样式（~23KB）
├── storage.js      # LocalStorage 数据持久化层
├── task.js         # 任务业务逻辑层
├── ui.js           # DOM 渲染与交互层
├── app.js          # 应用入口，连接各模块
└── README.md       # 项目技术文档
```

### 加载顺序（重要）

```html
<script src="storage.js"></script>  <!-- 第1步：数据层 -->
<script src="task.js"></script>    <!-- 第2步：业务逻辑层 -->
<script src="ui.js"></script>     <!-- 第3步：UI渲染层 -->
<script src="app.js"></script>     <!-- 第4步：应用入口 -->
```

> `app.js` 依赖 `TaskManager`（task.js）和 `UI`（ui.js），而这两者又依赖 `Storage`（storage.js）。四层模块通过 IIFE（立即执行函数）构成闭包，变量不污染全局命名空间。

---

## 设计规范

### 色彩系统（CSS 变量）

| 变量 | 色值 | 用途 |
|------|------|------|
| `--bg-primary` | `#f5f4f1` | 页面背景（暖白）|
| `--bg-secondary` | `#eceae6` | 筛选栏背景 |
| `--bg-card` | `#ffffff` | 任务卡片背景 |
| `--accent` | `#f58230` | 主色调（琥珀橙）|
| `--accent-dim` | `rgba(245,130,48,0.1)` | 选中态背景 |
| `--text-primary` | `#1c1a17` | 主要文字 |
| `--text-secondary` | `#6b6760` | 次要文字 |
| `--text-tertiary` | `#a8a49e` | 提示/时间戳 |
| `--text-done` | `#b8b4ae` | 已完成文字（划线色）|
| `--error` | `#dc3c3c` | 错误提示 |
| `--warn` | `#d97706` | 警告提示 |
| `--success` | `#22c55e` | 成功提示 |

### 字体

| 用途 | 字体 | 回退 |
|------|------|------|
| 正文/输入框 | Geist Mono | Fira Code, Cascadia Code, monospace |
| 品牌标题 | Syne | Geist, sans-serif |

> 均通过 Google Fonts CDN 加载：`https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600;700&family=Syne:wght@400;600;700;800&display=swap`

### 间距系统

采用 4px 基准网格：

| 变量 | 值 | 用途 |
|------|---|------|
| `--space-xs` | 3px | 任务项内间距 |
| `--space-sm` | 6px | 紧凑间距 |
| `--space-md` | 10px | 列表项间距 |
| `--space-lg` | 14px | 区块间距 |
| `--space-xl` | 18px | 主容器间距 |
| `--space-2xl` | 20px | 大区块间距 |

### 圆角系统

| 变量 | 值 | 用途 |
|------|---|------|
| `--radius-xs` | 3px | 筛选 Tab |
| `--radius-sm` | 5px | 按钮、计数徽章 |
| `--radius-md` | 8px | 任务卡片 |
| `--radius-lg` | 12px | 输入框 |

### 动效曲线

| 曲线 | 函数 | 用途 |
|------|------|------|
| 弹性回弹 | `cubic-bezier(0.34,1.56,0.64,1)` | 任务入场、完成动画 |
| 快速退出 | `cubic-bezier(0.16,1,0.3,1)` | 任务删除、Toast |
| 平滑过渡 | `cubic-bezier(0.4,0,0.2,1)` | 状态切换 |

---

## 架构设计

采用 **MVC 模式**（Model-View-Controller）的三层模块化架构：

```
┌─────────────────────────────────────────┐
│                 app.js                   │
│           应用入口（Controller）          │
│  - 绑定事件处理器                        │
│  - 调用 TaskManager 与 UI               │
│  - 协调各模块                           │
└───────────────┬─────────────────────────┘
                │
    ┌───────────┴───────────┐
    ▼                       ▼
┌────────────┐        ┌────────────┐
│  task.js   │        │    ui.js   │
│  Model层   │◄──────►│  View层    │
│            │        │            │
│ - 业务逻辑 │        │ - DOM渲染  │
│ - 状态管理 │        │ - 用户交互  │
│ - 筛选过滤 │        │ - 动画控制 │
└─────┬──────┘        └─────┬──────┘
      │                      │
      └──────────┬───────────┘
                 ▼
          ┌────────────┐
          │ storage.js │
          │   数据层    │
          │            │
          │ LocalStorage│
          │  持久化     │
          └────────────┘
```

**模块解耦原则：**
- `Storage` 不感知 UI，只读写 JSON 数据
- `TaskManager` 不直接操作 DOM，只返回数据
- `UI` 不做业务判断，只负责渲染和事件响应
- `app.js` 作为调度器，根据用户操作调用对应模块

---

## 数据模型

### LocalStorage 结构

**Key:** `taskos_data_v1`

```json
{
  "tasks": [
    {
      "id": "m1abc234de_9xyz",
      "text": "完成任务一",
      "completed": false,
      "createdAt": 1743446400000,
      "completedAt": null,
      "deleted": false,
      "deletedAt": null
    }
  ],
  "version": 2
}
```

### 任务对象字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | 唯一标识，由 `Date.now().toString(36)` + 随机字符串生成 |
| `text` | String | 任务文本，最大 100 字符 |
| `completed` | Boolean | 是否已完成 |
| `createdAt` | Number | 创建时间戳（`Date.now()`）|
| `completedAt` | Number\|null | 完成时间戳，未完成时为 `null` |
| `deleted` | Boolean | 是否软删除（`true` = 已删除但保留历史）|
| `deletedAt` | Number\|null | 软删除时间戳 |

### 数据操作与删除策略

| 操作 | Storage 方法 | 数据行为 |
|------|------------|---------|
| 添加任务 | `addTask()` | `tasks.unshift()` 头部插入 |
| 软删除 | `softDeleteTask()` | 设置 `deleted: true` + `deletedAt`，保留原始数据 |
| 永久删除 | `permanentlyDeleteTask()` | `filter()` 从数组彻底移除 |
| 更新字段 | `updateTask()` | `map()` 合并更新 |

### 软删除与永久删除的场景区分

| 场景 | 删除类型 | 说明 |
|------|---------|------|
| 在"全部"栏删除 | 永久删除 | 从 LocalStorage 彻底抹除 |
| 在"未完成"栏删除 | 永久删除 | 从 LocalStorage 彻底抹除 |
| 在"已完成"栏删除 | 软删除（降级）| 保留历史，`completed: false` 降级为未完成 |
| "清空已完成"按钮 | 永久删除 | 遍历所有已完成任务，逐一 `permanentlyDeleteTask` |

---

## 功能清单

### 核心功能

| 功能 | 描述 | 入口 |
|------|------|------|
| ➕ 新增任务 | 输入内容后按 Enter 或点击按钮添加 | 输入框 |
| ✅ 完成任务 | 点击圆形复选框标记完成 | 任务卡片左侧 |
| ✏️ 编辑任务 | 双击任务文字进入编辑模式 | 任务卡片文字区域 |
| 🗑️ 删除任务 | 点击任务右侧 × 按钮删除 | 任务卡片右侧操作区 |
| 🔄 切换状态 | 再次点击复选框取消完成 | 任务卡片左侧 |
| 📋 三栏筛选 | 全部 / 未完成 / 已完成 | 筛选 Tab |
| 🧹 清空已完成 | 一键永久删除所有已完成任务 | 筛选栏右侧按钮 |
| 📊 进度条 | 实时显示完成百分比 | 顶栏右侧 |
| 📝 编辑确认 | Enter 保存 / Esc 取消 | 编辑输入框 |
| 🔢 字符计数 | 显示已输入字符数 `n/100` | 输入框右侧 |

### 任务生命周期

```
[新建] → [未完成状态] → [已完成] → [2秒后从列表消失]
                ↑            │
                └──[已完成栏删除]─┘ (降级为未完成，保留在"全部")
                │
                └──[全部/未完成栏删除] → [永久删除]
```

### 筛选逻辑

| 筛选器 | 逻辑 |
|--------|------|
| 全部（default）| `!deleted` 的所有任务，含历史完成的 |
| 未完成 | `!deleted && !completed` |
| 已完成 | `!deleted && completed && completedAt >= 当天零点`（仅今天完成的）|

---

## 交互与动画

### 动画一览表

| 动画名称 | 触发时机 | CSS 类 | 时长 | 曲线 |
|---------|---------|--------|------|------|
| 任务入场 | 添加任务时 | `task-just-added` | 0.5s | spring |
| 任务飞走 | 添加/完成/删除消失时 | `is-removing` | 0.45s | ease-out |
| 完成回弹 | 任务完成时 | `just-done` | 0.5s | ease-out |
| 撒花粒子 | 任务完成时 | 动态生成 | 1.1s | ease-out |
| Tab 计数弹跳 | 筛选切换时 | `countPop` | 0.35s | spring |
| 输入框聚焦 | 输入框获得焦点 | `focus-within` | 0.24s | smooth |
| 输入错误抖动 | 空内容提交时 | `has-error` + `inputShake` | 0.45s | ease-out |
| Toast 入场 | 提示出现时 | `toastEnter` | 0.4s | spring |
| Toast 离场 | 提示消失时 | `is-leaving` | 0.35s | ease-out |
| 顶栏滑入 | 页面加载时 | `topbarSlide` | 0.5s | ease-out |
| 品牌脉冲 | 页面加载后持续 | `brandPulse` | 3s 循环 | ease-in-out |
| 进度条填充 | 进度变化时 | CSS transition | 0.5s | ease-out |

### 动画细节

#### 1. 任务添加动画（入场 + 消失）
- **入场**：`taskEnter` 关键帧 — 从左侧 `translateX(-20px)` 滑入，`scale(0.97→1.01→0.99→1)` 三段弹性回弹
- **橙色光晕**：入场期间卡片边框变为 `rgba(245,130,48,0.3)`，box-shadow 加亮
- **消失**：2 秒后触发 `is-removing` → `taskFlyOut` 向右飞出 + 淡出 + 高度收缩

#### 2. 撒花粒子（`spawnConfetti`）
- 在任务所在位置计算坐标（`getBoundingClientRect`）
- 生成 14 个随机彩色方块/圆点
- 每个粒子有独立 `@keyframes`，方向、速度、旋转角度均随机
- 动画结束后自动移除 DOM 元素和动态注入的 `<style>` 标签

#### 3. 进度条
- 宽度通过 CSS `transition` 平滑变化
- 右侧有流动高光（`shimmer` 动画）
- 无任务时隐藏整个进度条区域

### 键盘快捷键

| 快捷键 | 行为 |
|--------|------|
| `Enter` | 添加任务（输入框内）|
| `Enter` | 保存编辑（编辑输入框内）|
| `Esc` | 取消编辑（编辑输入框内）|

---

## 模块职责说明

### storage.js（数据层）

```
Storage.getAll()              → 获取所有任务数组
Storage.addTask(task)         → 头部插入任务
Storage.softDeleteTask(id)   → 软删除（标记 deleted）
Storage.permanentlyDeleteTask(id) → 永久删除（filter）
Storage.updateTask(id, obj)   → 合并更新字段
Storage.clearCompleted()      → 删除所有 completed 的任务
Storage.generateId()          → 生成唯一 ID（时间戳36进制 + 随机）
```

**数据损坏恢复机制**：读取时若 JSON.parse 失败，自动重置为 `{tasks:[], version:2}`。

### task.js（业务逻辑层）

```
TaskManager.init()            → 初始化，从 Storage 加载
TaskManager.add(text)         → 验证 → 构建任务对象 → 持久化
TaskManager.toggle(id)        → 取反 completed，记录 completedAt
TaskManager.remove(id)        → 软删除
TaskManager.permanentRemove(id)→ 永久删除
TaskManager.demoteToActive(id)→ 已完成→未完成（仅改状态）
TaskManager.updateText(id, text) → 更新文字
TaskManager.clearDone()       → 永久删除所有已完成
TaskManager.getFiltered()      → 按当前筛选器返回任务列表
TaskManager.getStats()        → 返回 {total, done, active, todayDone}
TaskManager.setFilter(f)      → 切换筛选器
TaskManager.getCurrentFilter()→ 获取当前筛选器
TaskManager.findById(id)      → 查找任务（含已软删除的）
```

**关键设计**：`_tasks` 始终为未删除任务，`Storage.getAll()` 可能包含软删除任务用于历史查询。

### ui.js（视图层）

```
UI.init()                     → 缓存 DOM 元素，初始化日期
UI.renderList(tasks)         → 清空列表 → 逐个渲染任务卡片
UI.renderTaskItem(task)       → 创建 <li> 卡片 DOM，注入事件绑定
UI.updateStats(stats)         → 更新 4 个计数 + 进度条 + 清除按钮状态
UI.updateFilterTabs(filter)   → 切换 Tab 高亮
UI.showToast(msg, type)      → 创建 Toast 节点，2.8s 后自动移除
UI.showError(msg)             → 显示输入错误提示，2.5s 后自动消失
UI.animateAddTask(id)         → 触发入场动画 + 橙色光晕
UI.animateRemoveTask(id)      → 触发飞走动画
UI.animateDoneTask(id)        → 触发完成回弹 + 撒花
UI.triggerConfetti(id)        → 在任务位置生成撒花粒子
UI.setEditing(id, bool)       → 切换编辑模式，显示/隐藏输入框
UI.updateTaskText(id, text)   → 更新文字（编辑后）
UI.bindEvents(handlers)       → 绑定所有事件（事件委托）
```

**事件委托**：任务列表使用 `.task-list` 的事件委托处理点击，而非给每个任务单独绑定，减少内存占用。

### app.js（入口层）

```
render()                     → 调用 TaskManager.getFiltered() + getStats()
                             → 调用 UI.updateStats() + renderList()
handlers.onAdd(text)          → 清空输入框 → 添加 → 渲染 → 动画 → 2秒后永久删除
handlers.onDelete(id)        → 根据当前筛选器决定：降级 or 永久删除
handlers.onToggle(id)        → 切换完成 → 渲染 → 撒花动画 → 2秒后永久删除
handlers.onEditConfirm()      → 验证非空 → 更新 → 重新渲染文字
handlers.onFilter(f)         → 切换筛选 → 重新渲染
handlers.onClearDone()       → 永久删除所有已完成 → 重新渲染
```

---

## CSS 架构

### 文件组织

单文件 `style.css` 按以下顺序组织：

```
1. CSS 变量 (:root)
2. 重置样式 (*)
3. 滚动条 & 选择颜色
4. 顶栏 (.topbar)
   - 进度条 (.progress-wrap / .progress-bar / .progress-fill)
   - 统计数字 (.stat-*)
5. 主容器 (.app-container)
6. 输入区 (.input-section / .input-wrapper / .add-btn)
7. 筛选栏 (.filter-tabs / .filter-tab / .tab-count)
8. 任务列表 (.task-list / .task-item)
   - 复选框 (.task-check)
   - 任务内容 (.task-body / .task-text / .task-edit-input)
   - 右侧区域 (.task-right / .task-actions / .action-btn)
9. 空状态 (.empty-state)
10. 撒花容器 (.confetti-container / .confetti-piece)
11. Toast 通知 (.toast-container / .toast)
12. 底部提示 (.footer-tip)
13. 背景装饰 (.bg-deco)
14. 动画关键帧 (@keyframes)
15. 响应式 (@media)
```

### 伪元素 `::before` 的妙用

任务卡片左侧橙色竖线通过 `::before` 实现：
```css
.task-item::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--accent);
  opacity: 0;
  border-radius: 0 2px 2px 0;
  transition: opacity 240ms;
}
.task-item:hover::before { opacity: 0.7; }
```

### 动画类的控制方式

使用 `classList.add()` / `classList.remove()` 控制动画：
- `.task-just-added`：入场动画
- `.is-removing`：飞走动画
- `.just-done`：完成回弹
- `.is-editing`：编辑态边框

### 撒花粒子的动态样式注入

每个粒子在创建时生成唯一的 `animationId`，并向 `<head>` 注入对应的 `@keyframes` 样式，避免 CSS 类名冲突：

```javascript
const pieceId = 'cf_' + Date.now() + '_' + i;
const style = document.createElement('style');
style.textContent = `
  @keyframes ${pieceId} {
    0% { transform: translate(0,0) rotate(0deg); opacity: 1; }
    100% { transform: translate(${vx}px, ${y+300}px) rotate(...deg); opacity: 0; }
  }
`;
document.head.appendChild(style);
piece.style.animation = `${pieceId} 1.1s ... forwards`;
```

动画结束后自动清理：
```javascript
piece.addEventListener('animationend', () => {
  piece.remove();
  style.remove(); // 清理动态样式
});
```

---

## 浏览器兼容性

| 功能 | 兼容性 |
|------|--------|
| CSS 变量 | IE 不支持，所有现代浏览器支持 |
| `backdrop-filter` | Safari 需 `-webkit-` 前缀 |
| `calc()` | IE9+ 支持 |
| `transition` | IE10+ 支持 |
| `transform` | IE10+ 支持 |
| `LocalStorage` | IE8+ 支持 |
| `dataset` API | IE11+ 支持 |
| `classList` | IE10+ 支持 |
| `Array.filter/map` | IE9+ 支持 |

**最低支持目标**：现代浏览器（Chrome、Edge、Firefox、Safari 最近两个版本）。

---

## 后续可扩展方向

- [ ] 数据导入/导出（JSON/CSV）
- [ ] 任务优先级（高/中/低）
- [ ] 任务分类/标签
- [ ] 任务到期提醒
- [ ] 深色模式切换
- [ ] 移动端适配优化
- [ ] 键盘快捷键（快捷键面板）
- [ ] 任务搜索/全文检索
- [ ] 多语言支持
- [ ] 云端同步（结合后端 API）
