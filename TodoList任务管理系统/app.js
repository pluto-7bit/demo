/**
 * app.js — 应用入口
 */

(function () {
  TaskManager.init();
  UI.init();

  function render() {
    const stats = TaskManager.getStats();
    const filter = TaskManager.getFilter();
    const tasks = TaskManager.getFiltered();
    UI.updateStats(stats);
    UI.updateFilterTabs(filter);
    UI.renderList(tasks);
  }

  const handlers = {
    onAdd(text) {
      if (!text.trim()) { UI.showError('任务内容不能为空'); return; }
      var inp = document.getElementById('taskInput');
      var raw = inp ? inp.value : text;
      var task = TaskManager.add(raw);
      inp && (inp.value = '');
      UI.updateCounter && UI.updateCounter(0);
      render();
      UI.highlightTask(task.id);
      UI.animateAddTask(task.id);
      UI.showToast('\u300c' + (task.text.slice(0,12)) + (task.text.length>12?'\u2026':'') + '\u300d\u5df2\u6dfb\u52a0 \u2713', 'success');
      setTimeout(function() {
        UI.animateRemoveTask(task.id);
        setTimeout(function() {
          TaskManager.permanentRemove(task.id);
          render();
        }, 450);
      }, 2000);
    },

    onDelete(id) {
      var task = TaskManager.findById(id);
      if (!task) return;
      if (TaskManager.getCurrentFilter() === 'completed') {
        TaskManager.demoteToActive(id);
        render();
        UI.showToast('\u300c' + (task.text.slice(0,12)) + (task.text.length>12?'\u2026':'') + '\u300d\u5df2\u79fb\u81f3\u672a\u5b8c\u6210', 'info');
      } else {
        UI.animateRemoveTask(id);
        UI.showToast('\u300c' + (task.text.slice(0,12)) + (task.text.length>12?'\u2026':'') + '\u300d\u5df2\u5220\u9664', 'warn');
        setTimeout(function() {
          TaskManager.permanentRemove(id);
          render();
        }, 2000);
      }
    },

    onToggle(id) {
      var updated = TaskManager.toggle(id);
      if (!updated) return;
      render();
      if (updated.completed) {
        UI.animateDoneTask(id);
        UI.triggerConfetti(id);
        UI.showToast('\u4efb\u52a1\u5b8c\u6210\uff01\ud83c\udf89', 'success');
        setTimeout(function() {
          UI.animateRemoveTask(id);
          setTimeout(function() {
            TaskManager.remove(id);
            render();
          }, 450);
        }, 2000);
      }
    },

    onEditStart: function(id) { UI.setEditing(id, true); },

    onEditConfirm: function(id, newText) {
      var trimmed = newText.trim();
      if (!trimmed) { UI.showError('\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a'); UI.setEditing(id, false); return; }
      var updated = TaskManager.updateText(id, trimmed);
      if (updated) {
        UI.setEditing(id, false);
        UI.updateTaskText(id, updated.text);
        UI.showToast('\u5df2\u66f4\u65b0 \u2713', 'info');
      } else {
        UI.setEditing(id, false);
      }
    },

    onEditCancel: function(id) {
      var task = TaskManager.findById(id);
      if (task) { UI.setEditing(id, false); UI.updateTaskText(id, task.text); }
    },

    onFilter: function(filter) { TaskManager.setFilter(filter); render(); },

    onClearDone: function() {
      var count = TaskManager.getStats().done;
      if (count === 0) return;
      TaskManager.clearDone();
      render();
      UI.showToast('\u5df2\u6e05\u7a7a ' + count + ' \u9879\u5df2\u5b8c\u6210\u4efb\u52a1', 'warn');
    },
  };

  UI.bindEvents(handlers);
  render();
  UI.focusInput();
})();
