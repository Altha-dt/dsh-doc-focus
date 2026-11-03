const KEY = 'dsh-doc-focus:height';
const MODE_KEY = 'dsh-doc-focus:mode';
const BAR = 30;

export function clampHeight(value, viewportHeight) {
  const max = Math.max(100, Math.floor(viewportHeight * 0.65));
  const min = Math.min(180, max);
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 260));
}

export function mount(doc, win, css) {
  const singleton = Symbol.for('dsh-doc-focus:mounted');
  if (win[singleton]) return () => {};
  win[singleton] = true;
  const style = doc.createElement('style');
  style.dataset.docFocusStyle = '';
  style.textContent = css;
  doc.head.append(style);
  let height = 260;
  try { const saved = win.localStorage.getItem(KEY); if (saved !== null) height = Number(saved); } catch {}
  let mode = 'card';
  try { const saved = win.localStorage.getItem(MODE_KEY); if (saved === 'corner') mode = 'corner'; } catch {}
  let active = null;
  let scheduled = 0;
  let destroyed = false;
  let drag = null;
  let restoreFocus = null;
  const viewport = () => win.visualViewport?.height ?? win.innerHeight;
  const toolbar = doc.createElement('div');
  toolbar.dataset.docFocusToolbar = '';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', '全屏阅读与主会话');
  const resize = doc.createElement('div');
  resize.dataset.docFocusResize = '';
  resize.tabIndex = 0;
  resize.setAttribute('role', 'separator');
  resize.setAttribute('aria-orientation', 'horizontal');
  resize.setAttribute('aria-label', '调整悬浮主会话高度，方向键调整');
  const label = doc.createElement('span');
  label.textContent = '主会话';
  const hint = doc.createElement('span');
  hint.dataset.docFocusHint = '';
  hint.textContent = '拖动调整 · 可查看回复并继续对话';
  resize.append(label, hint);
  const collapse = doc.createElement('button');
  collapse.type = 'button';
  const exit = doc.createElement('button');
  exit.type = 'button';
  exit.textContent = '退出全屏';
  toolbar.append(resize, collapse, exit);
  const bubble = doc.createElement('button');
  bubble.type = 'button';
  bubble.dataset.docFocusBubble = '';
  bubble.setAttribute('aria-label', '展开主会话');
  bubble.textContent = '对话';

  function measure() {
    const h = clampHeight(height, viewport());
    const bottom = Math.max(0, win.innerHeight - (win.visualViewport?.height ?? win.innerHeight) - (win.visualViewport?.offsetTop ?? 0));
    doc.documentElement.style.setProperty('--doc-focus-height', `${h}px`);
    doc.documentElement.style.setProperty('--doc-focus-bottom', `${bottom}px`);
    resize.setAttribute('aria-valuemin', String(Math.min(180, Math.max(100, Math.floor(viewport() * .65)))));
    resize.setAttribute('aria-valuemax', String(Math.max(100, Math.floor(viewport() * .65))));
    resize.setAttribute('aria-valuenow', String(h));
  }
  function saveHeight() {
    try { win.localStorage.setItem(KEY, String(height)); } catch {}
  }
  function saveMode() {
    try { win.localStorage.setItem(MODE_KEY, mode); } catch {}
  }
  function applyMode() {
    collapse.textContent = mode === 'corner' ? '展开' : '收起';
    if (!active) return;
    if (mode === 'corner') {
      active.chat.setAttribute('data-doc-focus-corner', '');
      toolbar.setAttribute('data-doc-focus-hidden', '');
      doc.body.append(bubble);
    } else {
      active.chat.removeAttribute('data-doc-focus-corner');
      toolbar.removeAttribute('data-doc-focus-hidden');
      bubble.remove();
    }
  }
  function toggleMode() {
    mode = mode === 'corner' ? 'card' : 'corner';
    saveMode();
    applyMode();
  }
  function endDrag() {
    if (!drag) return;
    drag = null;
    doc.body.removeAttribute('data-doc-focus-dragging');
    saveHeight();
  }
  function deactivate() {
    if (!active) return;
    endDrag();
    active.panel.removeAttribute('data-doc-focus-panel');
    active.chat.removeAttribute('data-doc-focus-chat');
    active.chat.removeAttribute('data-doc-focus-corner');
    for (const ancestor of active.ancestors) ancestor.removeAttribute('data-doc-focus-ancestor');
    toolbar.remove();
    toolbar.removeAttribute('data-doc-focus-hidden');
    bubble.remove();
    active = null;
    for (const prop of ['--doc-focus-height', '--doc-focus-bottom']) doc.documentElement.style.removeProperty(prop);
  }
  function visible(el) {
    if (el.getClientRects().length === 0) return false;
    // Our own collapsed state hides the card on purpose; it must stay "visible" to the tracker.
    if (el.hasAttribute('data-doc-focus-corner')) return true;
    return !el.checkVisibility || el.checkVisibility({ checkVisibilityCSS: true });
  }
  function sync() {
    scheduled = 0;
    if (destroyed) return;
    const panel = [...doc.querySelectorAll('[data-sidebar-right-panel="fullscreen"][data-sidebar-right-open]')]
      .find(el => el.getAttribute('aria-hidden') !== 'true' && visible(el));
    const session = panel?.getAttribute('data-sidebar-right-session');
    const chat = session ? [...doc.querySelectorAll('[data-conversation-content][data-conversation-session]')]
      .find(el => el.getAttribute('data-conversation-session') === session && el.querySelector('[data-composer-seat]') && visible(el)) : null;
    // Keep an existing dock when the soft keyboard shrinks the visual viewport.
    // Auto-fullscreen on narrow windows uses the same layout and native exit control.
    if (!panel || !chat || (viewport() < 400 && !active)) {
      deactivate();
      return;
    }
    if (active?.panel === panel && active.chat === chat) return;
    deactivate();
    const ancestors = [];
    for (let node = chat.parentElement; node && node !== doc.body && !node.hasAttribute('data-rightbar-fullscreen'); node = node.parentElement) ancestors.push(node);
    restoreFocus = doc.activeElement;
    active = { panel, chat, ancestors };
    panel.dataset.docFocusPanel = '';
    chat.dataset.docFocusChat = '';
    for (const ancestor of ancestors) ancestor.dataset.docFocusAncestor = '';
    measure();
    doc.body.append(toolbar);
    applyMode();
    // Observe geometry only; never scroll the reader or focus away from an iframe/editor.
  }
  function schedule() {
    if (!destroyed && !scheduled) scheduled = win.requestAnimationFrame(sync);
  }
  function leave() {
    const panel = active?.panel;
    const button = panel?.querySelector('[data-sidebar-right-mode="push"]');
    if (button) {
      button.click();
      deactivate();
      if (restoreFocus?.isConnected && restoreFocus !== doc.body) restoreFocus.focus({ preventScroll: true });
    }
  }
  function onKey(event) {
    if (!active || event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
    if (doc.querySelector('[role="dialog"][aria-modal="true"], [role="menu"], [data-trigger-menu]')) return;
    // Let native editors, search boxes and embedded pages handle Escape themselves.
    if (event.target instanceof win.Element && event.target.closest('input, textarea, [contenteditable="true"], .cm-editor, iframe')) return;
    leave();
  }
  function onResize() { if (active) measure(); schedule(); }
  function startDrag(event) {
    if (event.button !== 0 || !active) return;
    drag = { y: event.clientY, height: clampHeight(height, viewport()), pointerId: event.pointerId };
    resize.setPointerCapture(event.pointerId);
    doc.body.dataset.docFocusDragging = '';
    event.preventDefault();
  }
  function moveDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    height = clampHeight(drag.height + drag.y - event.clientY, viewport());
    measure();
  }
  function resizeKey(event) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') height = 180;
    else if (event.key === 'End') height = viewport() * .65;
    else height = clampHeight(height + (event.key === 'ArrowUp' ? 24 : -24), viewport());
    measure();
    saveHeight();
  }
  const observer = new win.MutationObserver(records => {
    if (records.every(record => {
      if (record.type === 'attributes') return record.target === doc.documentElement;
      // Ignore streaming, browser frames and our own toolbar changes when the two owners survive.
      return active?.panel.isConnected && active.chat.isConnected &&
        (active.chat.contains(record.target) || active.panel.contains(record.target) || toolbar.contains(record.target) || bubble.contains(record.target));
    })) return;
    schedule();
  });
  observer.observe(doc.body, { subtree: true, childList: true, attributes: true,
    attributeFilter: ['data-sidebar-right-panel', 'data-sidebar-right-open', 'data-sidebar-right-session', 'aria-hidden', 'hidden', 'style'] });
  doc.addEventListener('keydown', onKey);
  win.addEventListener('resize', onResize);
  win.visualViewport?.addEventListener('resize', onResize);
  win.visualViewport?.addEventListener('scroll', onResize);
  resize.addEventListener('pointerdown', startDrag);
  resize.addEventListener('pointermove', moveDrag);
  resize.addEventListener('pointerup', endDrag);
  resize.addEventListener('pointercancel', endDrag);
  resize.addEventListener('lostpointercapture', endDrag);
  resize.addEventListener('keydown', resizeKey);
  collapse.addEventListener('click', toggleMode);
  bubble.addEventListener('click', toggleMode);
  exit.addEventListener('click', leave);
  schedule();
  return () => {
    destroyed = true;
    observer.disconnect();
    if (scheduled) win.cancelAnimationFrame(scheduled);
    deactivate();
    style.remove();
    doc.removeEventListener('keydown', onKey);
    win.removeEventListener('resize', onResize);
    win.visualViewport?.removeEventListener('resize', onResize);
    win.visualViewport?.removeEventListener('scroll', onResize);
    delete win[singleton];
  };
}

export function apply(ctx) {
  ctx.effect(() => mount(document, window, STYLE));
}
