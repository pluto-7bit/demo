/**
 * ui.js — UI 渲染与交互模块
 */

const UI = (function () {
  let _els = {};

  function cacheEls() {
    _els = {
      taskInput:      document.getElementById('taskInput'),
      inputWrapper:   document.getElementById('inputWrapper'),
      inputError:     document.getElementById('inputError'),
      inputCounter:   document.getElementById('inputCounter'),
      addBtn:         document.getElementById('addBtn'),
      taskList:       document.getElementById('taskList'),
      emptyState:     document.getElementById('emptyState'),
      filterTabs:     document.querySelectorAll('.filter-tab'),
      countAll:       document.getElementById('countAll'),
      countActive:    document.getElementById('countActive'),
      countCompleted: document.getElementById('countCompleted'),
      statTotal:      document.getElementById('statTotal'),
      statDone:       document.getElementById('statDone'),
      clearBtn:       document.getElementById('clearCompletedBtn'),
      currentDate:    document.getElementById('currentDate'),
      toastContainer: document.getElementById('toastContainer'),
      // 新增
      progressWrap:   document.getElementById('progressWrap'),
      progressFill:   document.getElementById('progressFill'),
      progressText:   document.getElementById('progressText'),
      confettiContainer: document.getElementById('confettiContainer'),
    };
  }

  function formatDate() {
    const now = new Date();
    const days = ['周日','周一','周二','周三','周四','周五','周六'];
    return `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}  ${days[now.getDay()]}`;
  }

  function formatTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const min = 60000, hour = 3600000, day = 86400000;
    if (diff < min) return '刚刚';
    if (diff < hour) return `${Math.floor(diff/min)} 分钟前`;
    if (diff < day) return `${Math.floor(diff/hour)} 小时前`;
    if (diff < 2*day) return '昨天';
    return `${Math.floor(diff/day)} 天前`;
  }

  // Toast
  let _toastTimer = null;
  function showToast(message, type = 'success') {
    const icons = { success: '✓', error: '✕', warn: '!', info: 'i' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '·'}</span>
      <span class="toast-message">${message}</span>
    `;
    _els.toastContainer.appendChild(toast);
    const toasts = _els.toastContainer.querySelectorAll('.toast');
    if (toasts.length > 3) toasts[0].remove();
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      toast.classList.add('is-leaving');
      toast.addEventListener('animationend', () => toast.remove());
    }, 2800);
  }

  // 撒花粒子
  function spawnConfetti(x, y) {
    const colors = ['#f58230','#f5a030','#ffd166','#06d6a0','#118ab2','#ef476f','#8338ec','#ff6b6b'];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 6 + 4;
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const velocity = Math.random() * 160 + 80;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity - 60;
      const startX = x + (Math.random() - 0.5) * 40;

      piece.style.cssText = `
        left: ${startX}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation: confettiFall 1s cubic-bezier(0.16,1,0.3,1) forwards;
        --vx: ${vx}px;
        --vy: ${vy}px;
      `;

      // 手动关键帧注入
      const pieceId = 'cf_' + Date.now() + '_' + i;
      const style = document.createElement('style');
      style.textContent = `
        @keyframes ${pieceId} {
          0% { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(${vx}px, ${y + 300}px) rotate(${Math.random()*720-360}deg) scale(0.2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
      piece.style.animation = `${pieceId} 1.1s cubic-bezier(0.16,1,0.3,1) forwards`;

      _els.confettiContainer.appendChild(piece);
      piece.addEventListener('animationend', () => {
        piece.remove();
        style.remove();
      });
    }
  }

  // 进度条
  function updateProgress(stats) {
    if (stats.total === 0) {
      _els.progressWrap.style.display = 'none';
      return;
    }
    _els.progressWrap.style.display = 'flex';
    const pct = Math.round((stats.done / stats.total) * 100);
    _els.progressFill.style.width = pct + '%';
    _els.progressText.innerHTML = `<span>${pct}</span>%`;
  }

  // 渲染任务项
  function renderTaskItem(task) {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' is-done' : ''}`;
    li.dataset.id = task.id;
    li.innerHTML = `
      <div class="task-check">
        <input type="checkbox" id="check-${task.id}" ${task.completed ? 'checked' : ''} aria-label="切换完成状态" />
        <div class="task-check-visual" aria-hidden="true"></div>
      </div>
      <div class="task-body">
        <span class="task-text">${_escape(task.text)}</span>
        <input type="text" class="task-edit-input" value="${_escape(task.text)}" maxlength="100" aria-label="编辑任务" />
      </div>
      <div class="task-right">
        <span class="task-time">${task.completed ? '✓ ' : ''}${formatTime(task.completed ? task.completedAt : task.createdAt)}</span>
        <div class="task-actions">
          <button class="action-btn action-btn--edit" title="编辑" aria-label="编辑">
            <span>✎</span>
          </button>
          <button class="action-btn action-btn--delete" title="删除" aria-label="删除">
            <span>✕</span>
          </button>
        </div>
      </div>
    `;
    return li;
  }

  function _escape(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function renderList(tasks) {
    _els.taskList.innerHTML = '';
    _els.emptyState.classList.toggle('is-visible', tasks.length === 0);
    tasks.forEach((task, index) => {
      const li = renderTaskItem(task);
      li.style.animationDelay = `${index * 35}ms`;
      _els.taskList.appendChild(li);
    });
  }

  function updateStats(stats) {
    _els.countAll.textContent = stats.total;
    _els.countActive.textContent = stats.active;
    _els.countCompleted.textContent = stats.todayDone || 0;
    _els.statTotal.textContent = stats.total;
    _els.statDone.textContent = stats.done;
    _els.clearBtn.disabled = stats.done === 0;
    updateProgress(stats);
  }

  function updateFilterTabs(filter) {
    _els.filterTabs.forEach(tab => {
      tab.classList.toggle('filter-tab--active', tab.dataset.filter === filter);
    });
  }

  function updateCounter(len) {
    const pct = len / 100;
    _els.inputCounter.textContent = `${len}/100`;
    _els.inputCounter.classList.toggle('near-limit', pct >= 0.85);
  }

  function showError(msg) {
    _els.inputWrapper.classList.add('has-error');
    _els.inputError.textContent = msg;
    setTimeout(() => {
      _els.inputWrapper.classList.remove('has-error');
      _els.inputError.textContent = '';
    }, 2500);
  }

  function clearError() {
    _els.inputWrapper.classList.remove('has-error');
    _els.inputError.textContent = '';
  }

  function focusInput() { _els.taskInput.focus(); }

  function highlightTask(id) {
    const li = _els.taskList.querySelector(`[data-id="${id}"]`);
    if (li) li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function animateRemoveTask(id) {
    const li = _els.taskList.querySelector(`[data-id="${id}"]`);
    if (li) li.classList.add('is-removing');
  }

  function animateAddTask(id) {
    const li = _els.taskList.querySelector(`[data-id="${id}"]`);
    if (!li) return;
    li.style.animation = 'none';
    void li.offsetWidth; // 触发重排，刷新动画
    li.style.animation = '';
    li.classList.add('task-just-added');
  }

  function animateDoneTask(id) {
    const li = _els.taskList.querySelector(`[data-id="${id}"]`);
    if (li) {
      li.classList.add('just-done');
      setTimeout(() => li.classList.remove('just-done'), 2000);
    }
  }

  function triggerConfetti(id) {
    const li = _els.taskList.querySelector(`[data-id="${id}"]`);
    if (!li) return;
    const rect = li.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    spawnConfetti(x, y);
  }

  // 绑定事件
  function bindEvents(handlers) {
    // 输入框
    _els.taskInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = _els.taskInput.value;
        if (val.trim()) {
          handlers.onAdd(val);
          _els.taskInput.value = '';
          updateCounter(0);
        }
      }
    });

    _els.addBtn.addEventListener('click', () => {
      const val = _els.taskInput.value;
      if (val.trim()) {
        handlers.onAdd(val);
        document.getElementById('taskInput').value = '';
        _els.taskInput.value = '';
        updateCounter(0);
      } else {
        showError('请输入任务内容');
        focusInput();
      }
    });

    _els.taskInput.addEventListener('input', () => {
      updateCounter(_els.taskInput.value.length);
    });

    _els.taskInput.addEventListener('focus', clearError);

    // 任务列表事件委托
    _els.taskList.addEventListener('click', e => {
      const li = e.target.closest('.task-item');
      if (!li) return;
      const id = li.dataset.id;

      if (e.target.type === 'checkbox') {
        const wasActive = !e.target.checked;
        handlers.onToggle(id);
        if (wasActive) {
          animateDoneTask(id);
          setTimeout(() => triggerConfetti(id), 100);
        }
      }

      if (e.target.closest('.action-btn--delete')) {
        animateRemoveTask(id).then(() => handlers.onDelete(id));
      }

      if (e.target.closest('.action-btn--edit')) {
        handlers.onEditStart(id);
      }
    });

    // 双击文字编辑
    _els.taskList.addEventListener('dblclick', e => {
      const li = e.target.closest('.task-item');
      if (!li) return;
      if (e.target.closest('.task-check') || e.target.closest('.task-actions')) return;
      handlers.onEditStart(li.dataset.id);
    });

    // 编辑框事件
    _els.taskList.addEventListener('keydown', e => {
      if (e.target.classList.contains('task-edit-input')) {
        const li = e.target.closest('.task-item');
        if (e.key === 'Enter') { e.preventDefault(); handlers.onEditConfirm(li.dataset.id, e.target.value); }
        if (e.key === 'Escape') { handlers.onEditCancel(li.dataset.id); }
      }
    });

    _els.taskList.addEventListener('blur', e => {
      if (e.target.classList.contains('task-edit-input')) {
        const li = e.target.closest('.task-item');
        if (li && li.classList.contains('is-editing')) {
          handlers.onEditConfirm(li.dataset.id, e.target.value);
        }
      }
    }, true);

    // 筛选
    _els.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => handlers.onFilter(tab.dataset.filter));
    });

    // 清除已完成
    _els.clearBtn.addEventListener('click', () => {
      if (confirm('确定要清空所有已完成的任务吗？')) handlers.onClearDone();
    });
  }

  function setEditing(id, editing) {
    const li = _els.taskList.querySelector(`[data-id="${id}"]`);
    if (!li) return;
    li.classList.toggle('is-editing', editing);
    const textEl = li.querySelector('.task-text');
    if (editing) {
      const input = li.querySelector('.task-edit-input');
      input.focus();
      input.select();
      textEl.classList.add('editing');
    } else {
      textEl.classList.remove('editing');
    }
  }

  function updateTaskText(id, text) {
    const li = _els.taskList.querySelector(`[data-id="${id}"]`);
    if (!li) return;
    li.querySelector('.task-text').textContent = text;
    li.querySelector('.task-edit-input').value = text;
  }

  function setDone(id, done) {
    const li = _els.taskList.querySelector(`[data-id="${id}"]`);
    if (!li) return;
    const timeEl = li.querySelector('.task-time');
    timeEl.textContent = (done ? '✓ ' : '') + formatTime(done ? Date.now() : null);
  }

  function init() {
    cacheEls();
    _els.currentDate.textContent = formatDate();
    updateCounter(0);
  }

  return {
    init, renderList, updateStats, updateFilterTabs,
    showToast, showError, clearError, focusInput,
    highlightTask, bindEvents, setEditing,
    updateTaskText, setDone, animateDoneTask, triggerConfetti,
    formatTime,
  };
})();
