// content.js

(function () {
  const CONFIG = {
    defaultAllowedDomains: ['x.com', 'twitter.com', 'google.com'],
    maxQuests: 3,
    storageKey: 'questlog_data'
  };

  const QUEST_ICONS = {
    sword: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5-3 3zM13 13l2.5 2.5M6 6l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 21l4-4M19 17l2 2" stroke="currentColor" stroke-width="2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" fill="none"/>',
    potion: '<path d="M10 2v2m4-2v2M9 6h6v2a2 2 0 00-2 2v3a4 4 0 11-8 0v-3a2 2 0 00-2-2V6h6z" stroke="currentColor" stroke-width="2" fill="none"/>',
    scroll: '<path d="M8 2h8a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2zm0 0V6a2 2 0 01-2-2h2z" stroke="currentColor" stroke-width="2" fill="none"/>',
    ring: '<circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 5v-2m0 18v-2m7-7h2M5 12H3" stroke="currentColor" stroke-width="2"/>',
    crystal: '<path d="M12 2l-8 6 3 14 5 2 5-2 3-14-8-6z" stroke="currentColor" stroke-width="2" fill="none"/>',
    crown: '<path d="M3 16l2-7 4 4 3-6 3 6 4-4 2 7H3zm0 0v3h18v-3" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    phoenix: '<path d="M5 16c0-4 3-7 7-7s7 3 7 7-3 7-7 7c0-2 1-4 1-6s-1-4-3-5l-1 3-2-2zm10-9l2-3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
    tower: '<path d="M8 3h8l1 4-2 1 1 3-2 1v11H9V12L7 11l1-3-2-1 2-4z" stroke="currentColor" stroke-width="2" fill="none"/>',
    moon: '<path d="M16 4a8 8 0 11-7 12 6 6 0 007-12z" stroke="currentColor" stroke-width="2" fill="none"/>'
  };

  const UI_ICONS = {
    menu: '<path d="M5 7h14M5 12h14M5 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    minimize: '<path d="M6 15h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    add: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    save: '<path d="M6 4h11l3 3v13H4V4h2zm0 0v5h9V4" stroke="currentColor" stroke-width="2" fill="none"/>',
    back: '<path d="M14 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    check: '<path d="M5 13l4 4 10-10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    clock: '<circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 8v4l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    snooze: '<path d="M6 7h12M6 12h8M6 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 5l2-2M19 19l-2 2" stroke="currentColor" stroke-width="2"/>',
    rune: '<path d="M12 3l6 4v10l-6 4-6-4V7z" stroke="currentColor" stroke-width="2" fill="none"/>'
  };

  let state = {
    quests: [],
    history: [],
    allowedDomains: [...CONFIG.defaultAllowedDomains],
    isMinimized: false,
    minimizedPosition: { top: '100px', left: 'calc(100% - 80px)' },
    hiddenUntil: 0
  };

  const currentDomain = window.location.hostname.replace('www.', '');

  init();

  async function init() {
    await loadState();
    if (!shouldRender()) return;
    createUI();
  }

  function shouldRender() {
    return state.allowedDomains.some((domain) => currentDomain.includes(domain));
  }

  function loadState() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([CONFIG.storageKey], (result) => {
        if (result[CONFIG.storageKey]) {
          state = { ...state, ...result[CONFIG.storageKey] };
        }
        resolve();
      });
    });
  }

  function saveState() {
    chrome.storage.sync.set({ [CONFIG.storageKey]: state });
  }

  function createUI() {
    const existing = document.getElementById('questlog-root');
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = 'questlog-root';
    host.style.position = 'fixed';
    host.style.zIndex = '99999';
    host.style.top = '0';
    host.style.right = '0';
    host.style.left = 'auto';
    host.style.width = '0';
    host.style.height = '0';
    host.style.pointerEvents = 'auto';

    const shadow = host.attachShadow({ mode: 'open' });
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('style.css');
    shadow.appendChild(styleLink);

    const container = document.createElement('div');
    container.className = 'quest-container';
    container.style.pointerEvents = 'auto';

    render(container);
    shadow.appendChild(container);
    document.body.appendChild(host);
    window.qlContainer = container;
  }

  function isSleeping() {
    return Date.now() < state.hiddenUntil;
  }

  function render(container) {
    const sleeping = isSleeping();
    container.innerHTML = '';
    const classes = ['quest-container'];
    if (sleeping) {
      classes.push('sleeping');
    } else if (state.isMinimized) {
      classes.push('minimized');
    }
    container.className = classes.join(' ');
    window.qlContainer = container;

    if (!sleeping && state.isMinimized) {
      renderMinimized(container);
      return;
    }
    container.style.top = '';
    container.style.left = '';
    renderExpanded(container, sleeping);
  }

  function renderMinimized(container) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rune-button';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS.rune}</svg>
      <span class="sr-only">Expand Questlog</span>
    `;

    container.style.top = state.minimizedPosition.top;
    container.style.left = state.minimizedPosition.left;
    container.style.right = 'auto';
    container.style.transform = 'none';

    let isDragging = false;
    let startX;
    let startY;
    let initialLeft;
    let initialTop;
    let longPressTimer;
    let isLongPress = false;

    const onMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      container.style.left = `${initialLeft + dx}px`;
      container.style.top = `${initialTop + dy}px`;
    };

    const onMouseUp = () => {
      clearTimeout(longPressTimer);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.classList.remove('dragging');
      if (isDragging) {
        isDragging = false;
        isLongPress = false;
        state.minimizedPosition = {
          top: container.style.top,
          left: container.style.left
        };
        saveState();
      }
    };

    btn.addEventListener('mousedown', (e) => {
      longPressTimer = setTimeout(() => {
        isLongPress = true;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = container.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        container.classList.add('dragging');
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      }, 300);
    });

    btn.addEventListener('mouseup', () => {
      clearTimeout(longPressTimer);
    });

    btn.addEventListener('mouseleave', () => {
      clearTimeout(longPressTimer);
    });

    btn.addEventListener('click', (event) => {
      if (isDragging || isLongPress) return;
      event.preventDefault();
      state.isMinimized = false;
      saveState();
      render(container);
    });

    container.appendChild(btn);
  }

  function renderExpanded(container, sleeping = false) {
    const header = document.createElement('div');
    header.className = 'quest-header';
    header.innerHTML = `
      <span class="title">Active Quests (${state.quests.length}/${CONFIG.maxQuests})</span>
      <div class="actions">
        <button class="btn-icon" id="btn-menu" title="Lore menu">
          <svg viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS.menu}</svg>
          <span class="sr-only">Toggle menu</span>
        </button>
        <button class="btn-icon" id="btn-minimize" title="Hide board">
          <svg viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS.minimize}</svg>
          <span class="sr-only">Minimize</span>
        </button>
      </div>
    `;

    const list = document.createElement('div');
    list.className = 'quest-list';

    if (sleeping) {
      const message = document.createElement('div');
      message.className = 'sleeping-notice';
      message.innerHTML = `
        <div class="sleeping-symbol">
          <svg viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS.clock}</svg>
        </div>
        <div class="sleeping-copy">
          <p>Questlog 正在休息</p>
          <small>${getSleepText()}</small>
        </div>
        <button class="btn-wake-now" id="btn-wake-now" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS.add}</svg>
          <span>立即唤醒</span>
        </button>
      `;
      list.appendChild(message);
    } else {
      state.quests.forEach((quest, index) => {
        const item = document.createElement('div');
        item.className = 'quest-item';
        item.innerHTML = `
          <div class="quest-icon" title="Quest sigil">
            <svg viewBox="0 0 24 24" width="26" height="26">${QUEST_ICONS[quest.icon]}</svg>
          </div>
          <input type="text" class="quest-input" value="${quest.text}" placeholder="Describe your quest...">
          <button class="quest-complete" title="完成该任务" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS.check}</svg>
            <span>完成</span>
          </button>
        `;

        const completeButton = item.querySelector('.quest-complete');
        completeButton.addEventListener('click', () => completeQuest(index, container));

        const input = item.querySelector('.quest-input');
        input.addEventListener('input', (e) => {
          state.quests[index].text = e.target.value;
          saveState();
        });

        input.addEventListener('focus', () => item.classList.add('focus'));
        input.addEventListener('blur', () => item.classList.remove('focus'));

        list.appendChild(item);
      });

      if (state.quests.length < CONFIG.maxQuests) {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add';
        addBtn.type = 'button';
        addBtn.title = 'Summon new quest';
        addBtn.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS.add}</svg>
          <span class="sr-only">Add quest</span>
        `;
        addBtn.addEventListener('click', () => showIconSelector(container));
        list.appendChild(addBtn);
      }
    }

    const menu = document.createElement('div');
    menu.className = 'quest-menu hidden';
    menu.innerHTML = `
      <div class="menu-section">
        <h3>Quest History</h3>
        <div class="history-list">
          ${
            state.history.length === 0
              ? '<div class="empty-text">No legends yet.</div>'
              : state.history
                  .slice(0, 5)
                  .map(
                    (h) => `
              <div class="history-item">
                <span>${h.text || 'Unnamed quest'}</span>
                <small>${new Date(h.completedAt).toLocaleString()}</small>
              </div>
            `
                  )
                  .join('')
          }
        </div>
      </div>
      <div class="menu-section">
        <h3>Realm Settings</h3>
        <textarea id="domain-input" placeholder="Allowed domains...">${state.allowedDomains.join('\n')}</textarea>
        <button id="btn-save-domains" class="btn-icon solid" title="Save realms" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS.save}</svg>
          <span class="sr-only">Save domains</span>
        </button>
      </div>
      ${
        sleeping
          ? `
      <div class="menu-section">
        <h3>Visibility</h3>
        <label class="toggle-row">
          <input type="checkbox" id="wake-checkbox">
          <span>立即唤醒面板</span>
        </label>
      </div>`
          : ''
      }
    `;

    let minimizeOverlay = null;
    if (!sleeping) {
      minimizeOverlay = document.createElement('div');
      minimizeOverlay.className = 'minimize-overlay hidden';
      const minimizeOptions = [
        { time: 0, label: 'Now', icon: UI_ICONS.minimize, title: 'Just minimize' },
        { time: 15, label: '15m', icon: UI_ICONS.clock, title: 'Return in 15 minutes' },
        { time: 60, label: '1h', icon: UI_ICONS.clock, title: 'Return in 1 hour' },
        { time: 120, label: '2h', icon: UI_ICONS.clock, title: 'Return in 2 hours' },
        { time: -1, label: 'Hold', icon: UI_ICONS.snooze, title: 'Do not auto pop' }
      ];

      minimizeOverlay.innerHTML = `
        <div class="minimize-options">
          <h3>Retreat for...</h3>
          <div class="option-grid">
            ${minimizeOptions
              .map(
                (opt) => `
                  <button class="icon-chip" data-time="${opt.time}" data-label="${opt.label}" title="${opt.title}" type="button">
                    <svg viewBox="0 0 24 24" aria-hidden="true">${opt.icon}</svg>
                    <span class="sr-only">${opt.title}</span>
                  </button>
                `
              )
              .join('')}
          </div>
        </div>
      `;

      header.querySelector('#btn-minimize').addEventListener('click', () => {
        minimizeOverlay.classList.remove('hidden');
      });
    } else {
      const minimizeBtn = header.querySelector('#btn-minimize');
      minimizeBtn.disabled = true;
      minimizeBtn.classList.add('disabled');
    }

    header.querySelector('#btn-menu').addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });

    menu.querySelector('#btn-save-domains').addEventListener('click', () => {
      const textarea = menu.querySelector('#domain-input');
      state.allowedDomains = textarea
        .value.split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      saveState();
      textarea.blur();
    });

    if (minimizeOverlay) {
      minimizeOverlay.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', (e) => {
          const time = parseInt(e.currentTarget.dataset.time, 10);
          minimizeOverlay.classList.add('hidden');
          if (time === 0) {
            state.isMinimized = true;
            state.hiddenUntil = 0;
            saveState();
            render(container);
            return;
          }

          if (time === -1) {
            state.isMinimized = false;
            state.hiddenUntil = Number.MAX_SAFE_INTEGER;
            saveState();
            render(container);
            return;
          }

          state.isMinimized = false;
          state.hiddenUntil = Date.now() + time * 60 * 1000;
          saveState();
          render(container);
        });
      });

      minimizeOverlay.addEventListener('click', (e) => {
        if (e.target === minimizeOverlay) {
          minimizeOverlay.classList.add('hidden');
        }
      });
    }

    container.appendChild(header);
    container.appendChild(list);
    container.appendChild(menu);
    if (minimizeOverlay) {
      container.appendChild(minimizeOverlay);
    }

    if (sleeping) {
      const wakeBtn = list.querySelector('#btn-wake-now');
      if (wakeBtn) {
        wakeBtn.addEventListener('click', wakeBoard);
      }
    }

    const wakeCheckbox = menu.querySelector('#wake-checkbox');
    if (wakeCheckbox) {
      wakeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          wakeBoard();
        }
      });
    }
  }

  function showIconSelector(container) {
    if (state.quests.length >= CONFIG.maxQuests) return;
    const list = container.querySelector('.quest-list');
    if (!list) return;
    list.innerHTML = '';

    const selector = document.createElement('div');
    selector.className = 'icon-selector';
    Object.keys(QUEST_ICONS).forEach((key) => {
      const iconDiv = document.createElement('div');
      iconDiv.className = 'icon-option';
      iconDiv.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28">${QUEST_ICONS[key]}</svg>`;
      iconDiv.title = `Choose ${key}`;
      iconDiv.addEventListener('click', () => {
        state.quests.push({
          id: Date.now(),
          text: '',
          icon: key,
          createdAt: Date.now()
        });
        saveState();
        render(container);
      });
      selector.appendChild(iconDiv);
    });

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-icon ghost';
    backBtn.type = 'button';
    backBtn.title = 'Back to list';
    backBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS.back}</svg>
      <span class="sr-only">Back</span>
    `;
    backBtn.addEventListener('click', () => render(container));

    list.appendChild(selector);
    list.appendChild(backBtn);
  }

  function completeQuest(index, container) {
    const target = container || window.qlContainer;
    if (!target || !state.quests[index]) return;
    const items = target.querySelectorAll('.quest-item');
    const quest = state.quests[index];
    if (items[index]) {
      items[index].classList.add('completed-anim');
      setTimeout(() => {
        state.history.unshift({ ...quest, completedAt: Date.now() });
        state.quests.splice(index, 1);
        saveState();
        render(target);
      }, 500);
    }
  }

  function wakeBoard() {
    state.hiddenUntil = 0;
    state.isMinimized = false;
    saveState();
    if (window.qlContainer) {
      render(window.qlContainer);
    } else {
      init();
    }
  }

  function getSleepText() {
    if (state.hiddenUntil === Number.MAX_SAFE_INTEGER) {
      return '已设为不再自动弹出，可通过菜单重新启用。';
    }
    const remaining = state.hiddenUntil - Date.now();
    if (remaining <= 0) return '即将苏醒。';
    const mins = Math.ceil(remaining / 60000);
    if (mins >= 60) {
      const hours = Math.ceil(mins / 60);
      return `将在约 ${hours} 小时后回归。`;
    }
    return `将在约 ${mins} 分钟后回归。`;
  }
})();
