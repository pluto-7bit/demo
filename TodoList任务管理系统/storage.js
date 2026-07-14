/**
 * storage.js — LocalStorage 数据持久化模块
 */

const Storage = (function () {
  const KEY = 'taskos_data_v1';

  function _initData() {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const def = { tasks: [], version: 2 };
      localStorage.setItem(KEY, JSON.stringify(def));
      return def;
    }
    try {
      const data = JSON.parse(raw);
      if (!data.version) data.version = 2;
      if (!Array.isArray(data.tasks)) data.tasks = [];
      // 清理损坏任务（无id）
      data.tasks = data.tasks.filter(t => t.id);
      return data;
    } catch (e) {
      console.warn('[Storage] 数据损坏，重置。', e);
      const def = { tasks: [], version: 2 };
      localStorage.setItem(KEY, JSON.stringify(def));
      return def;
    }
  }

  // 获取所有任务（含软删除）
  function getAll() {
    return _initData().tasks;
  }

  function saveAll(tasks) {
    localStorage.setItem(KEY, JSON.stringify({ tasks, version: 2 }));
  }

  // 添加任务
  function addTask(task) {
    const tasks = getAll();
    tasks.unshift(task);
    saveAll(tasks);
    return tasks;
  }

  // 软删除：标记已删除，保留历史
  function softDeleteTask(id) {
    const tasks = getAll().map(t =>
      t.id === id ? { ...t, deleted: true, deletedAt: Date.now() } : t
    );
    saveAll(tasks);
    return tasks;
  }

  // 永久删除（从历史中彻底抹除）
  function permanentlyDeleteTask(id) {
    const tasks = getAll().filter(t => t.id !== id);
    saveAll(tasks);
    return tasks;
  }

  // 更新任务
  function updateTask(id, updates) {
    const tasks = getAll().map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    saveAll(tasks);
    return tasks;
  }

  // 清除已完成（仅清除已完成的未删除任务）
  function clearCompleted() {
    const tasks = getAll().filter(t => !t.deleted && !t.completed);
    saveAll(tasks);
    return tasks;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    getAll,
    addTask,
    softDeleteTask,
    permanentlyDeleteTask,
    updateTask,
    clearCompleted,
    generateId,
  };
})();
