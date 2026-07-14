/**
 * task.js — 任务业务逻辑模块
 */

const TaskManager = (function () {
  let _tasks = [];
  let _currentFilter = 'all';

  function init() {
    // 只取未删除的任务用于业务逻辑
    _tasks = Storage.getAll().filter(t => !t.deleted);
  }

  function getFiltered() {
    const allTasks = Storage.getAll().filter(t => !t.deleted);
    switch (_currentFilter) {
      case 'active':    return allTasks.filter(t => !t.completed);
      case 'completed': return getTodayCompleted();
      default:         return allTasks;
    }
  }

  // 仅今天完成的任务
  function getTodayCompleted() {
    const allTasks = Storage.getAll().filter(t => !t.deleted);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return allTasks.filter(t => t.completed && t.completedAt >= startOfDay.getTime());
  }

  // 获取今天完成数（供 UI 计数用）
  function getTodayDoneCount() {
    return getTodayCompleted().length;
  }

  function getStats() {
    const allTasks = Storage.getAll().filter(t => !t.deleted);
    const todayDone = getTodayCompleted().length;
    const total  = allTasks.length;
    const done   = allTasks.filter(t => t.completed).length;
    const active = total - done;
    return { total, done, active, todayDone };
  }

  function setFilter(filter) { _currentFilter = filter; }
  function getFilter()      { return _currentFilter; }

  function add(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const task = {
      id: Storage.generateId(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
      completedAt: null,
      deleted: false,
      deletedAt: null,
    };
    _tasks = Storage.addTask(task);
    // 返回未删除的任务列表
    _tasks = _tasks.filter(t => !t.deleted);
    return task;
  }

  function remove(id) {
    // 软删除：只标记，不真正删除数据
    _tasks = Storage.softDeleteTask(id);
    _tasks = _tasks.filter(t => !t.deleted);
  }

  function toggle(id) {
    const task = _tasks.find(t => t.id === id);
    if (!task) return null;
    const updates = {
      completed: !task.completed,
      completedAt: !task.completed ? Date.now() : null,
    };
    _tasks = Storage.updateTask(id, updates);
    _tasks = _tasks.filter(t => !t.deleted);
    return _tasks.find(t => t.id === id);
  }

  function updateText(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) return null;
    _tasks = Storage.updateTask(id, { text: trimmed });
    _tasks = _tasks.filter(t => !t.deleted);
    return _tasks.find(t => t.id === id);
  }

  function clearDone() {
    // 永久删除所有已完成的未删除任务
    const doneTasks = _tasks.filter(t => t.completed);
    doneTasks.forEach(t => Storage.permanentlyDeleteTask(t.id));
    _tasks = Storage.getAll().filter(t => !t.deleted);
  }

  function permanentRemove(id) {
    Storage.permanentlyDeleteTask(id);
    _tasks = _tasks.filter(t => t.id !== id);
  }

  // 获取当前筛选器
  function getCurrentFilter() { return _currentFilter; }

  // 已完成任务降级为未完成（不触发动画）
  function demoteToActive(id) {
    _tasks = Storage.updateTask(id, { completed: false, completedAt: null });
    _tasks = _tasks.filter(t => !t.deleted);
  }

  function findById(id) {
    // 先在未删除列表里找
    let t = _tasks.find(t => t.id === id);
    if (t) return t;
    // 再在已软删除的列表里找（用于已完成页面删除场景）
    return Storage.getAll().find(t => t.id === id) || null;
  }

  return {
    init, getFiltered, getStats,
    setFilter, getFilter, getCurrentFilter,
    add, remove, permanentRemove, demoteToActive,
    toggle, updateText, clearDone, findById,
  };
})();
