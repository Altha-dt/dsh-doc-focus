window.__ModuleLoader__.load({
  id: "dsh-doc-focus",
  factory: (require) => {
    const STYLE = "/* Attribute selectors deliberately follow the host's semantic DOM contract. */\n[data-doc-focus-panel] {\n  bottom: var(--doc-focus-reserved) !important;\n  transition: none !important;\n}\n[data-doc-focus-ancestor] {\n  background: transparent !important;\n  border-color: transparent !important;\n  pointer-events: none !important;\n}\n[data-doc-focus-chat] {\n  box-sizing: border-box !important;\n  position: fixed !important;\n  inset: auto 0 var(--doc-focus-bottom, 0px) 0 !important;\n  width: auto !important;\n  height: var(--doc-focus-height) !important;\n  min-height: 0 !important;\n  max-height: none !important;\n  z-index: 45 !important;\n  background: var(--dsw-alias-bg-base, #181818) !important;\n  pointer-events: auto !important;\n  --dsh-sidebar-height: 0px;\n  --dsh-composer-text-max-height: min(100px, 20vh);\n  --dsh-chat-content-width: min(100vw - 48px, 1000px);\n  --dsh-composer-card-max-width: min(100vw - 24px, 1032px);\n}\n[data-doc-focus-chat] > [data-conversation-scroll] {\n  height: 100% !important;\n  min-height: 0 !important;\n  overflow-y: auto !important;\n  overscroll-behavior: contain;\n}\n[data-doc-focus-chat] [data-composer-seat] {\n  --dsh-composer-text-max-height: min(100px, 20vh);\n}\n[data-doc-focus-toolbar] {\n  box-sizing: border-box;\n  position: fixed;\n  left: 0;\n  right: 0;\n  bottom: calc(var(--doc-focus-height) + var(--doc-focus-bottom, 0px));\n  height: 32px;\n  z-index: 46;\n  background: var(--dsw-alias-bg-base, #181818);\n  color: var(--dsw-alias-label-secondary, #aaa);\n  border-top: 1px solid var(--dsw-alias-border-l2, #555);\n  border-bottom: 1px solid var(--dsw-alias-border-l3, #444);\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 0 12px;\n  font: 12px/1.5 var(--dsw-font-family, sans-serif);\n  -webkit-app-region: no-drag;\n}\n[data-doc-focus-resize] {\n  align-self: stretch;\n  flex: 1;\n  min-width: 40px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  cursor: ns-resize;\n  touch-action: none;\n  user-select: none;\n  outline-offset: -2px;\n}\n[data-doc-focus-resize]::before {\n  content: '';\n  width: 28px;\n  height: 3px;\n  flex-shrink: 0;\n  border-radius: 3px;\n  background: var(--dsw-alias-border-l1, #888);\n}\n[data-doc-focus-toolbar] button {\n  border: 0;\n  background: transparent;\n  color: inherit;\n  cursor: pointer;\n  border-radius: 5px;\n  padding: 3px 8px;\n  font: inherit;\n}\n[data-doc-focus-toolbar] button:hover {\n  background: var(--dsw-alias-interactive-bg-hover, #7773);\n}\n[data-doc-focus-toolbar] button:focus-visible,\n[data-doc-focus-resize]:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary, #568bff);\n}\nbody[data-doc-focus-dragging], body[data-doc-focus-dragging] * { cursor: ns-resize !important; }\n/* iframe surfaces would otherwise swallow the resize pointer. */\nbody[data-doc-focus-dragging] iframe { pointer-events: none !important; }\n@media (max-width: 600px) {\n  [data-doc-focus-toolbar] { gap: 4px; padding-inline: 8px; }\n  [data-doc-focus-hint] { display: none; }\n}\n";
const KEY = 'dsh-doc-focus:height';
const BAR = 32;

function clampHeight(value, viewportHeight) {
  const max = Math.max(100, Math.floor(viewportHeight * 0.65));
  const min = Math.min(180, max);
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 260));
}

function mount(doc, win, css) {
  const singleton = Symbol.for('dsh-doc-focus:mounted');
  if (win[singleton]) return () => {};
  win[singleton] = true;
  const style = doc.createElement('style');
  style.dataset.docFocusStyle = '';
  style.textContent = css;
  doc.head.append(style);
  let height = 260;
  try { const saved = win.localStorage.getItem(KEY); if (saved !== null) height = Number(saved); } catch {}
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
  resize.setAttribute('aria-label', '调整底部主会话高度，方向键调整');
  const label = doc.createElement('span');
  label.textContent = '主会话';
  const hint = doc.createElement('span');
  hint.dataset.docFocusHint = '';
  hint.textContent = '拖动调整 · 可查看回复并继续对话';
  resize.append(label, hint);
  const expand = doc.createElement('button');
  expand.type = 'button';
  expand.textContent = '展开对话';
  const exit = doc.createElement('button');
  exit.type = 'button';
  exit.textContent = '退出全屏';
  toolbar.append(resize, expand, exit);

  const compactHeight = () => clampHeight(Math.min(220, viewport() * .4), viewport());
  const expandedHeight = () => clampHeight(viewport() * .65, viewport());
  const isExpanded = () => clampHeight(height, viewport()) > (compactHeight() + expandedHeight()) / 2;
  function measure() {
    const h = clampHeight(height, viewport());
    const bottom = Math.max(0, win.innerHeight - (win.visualViewport?.height ?? win.innerHeight) - (win.visualViewport?.offsetTop ?? 0));
    doc.documentElement.style.setProperty('--doc-focus-height', `${h}px`);
    doc.documentElement.style.setProperty('--doc-focus-reserved', `${h + BAR + bottom}px`);
    doc.documentElement.style.setProperty('--doc-focus-bottom', `${bottom}px`);
    resize.setAttribute('aria-valuemin', String(Math.min(180, Math.max(100, Math.floor(viewport() * .65)))));
    resize.setAttribute('aria-valuemax', String(Math.max(100, Math.floor(viewport() * .65))));
    resize.setAttribute('aria-valuenow', String(h));
    expand.textContent = isExpanded() ? '收起对话' : '展开对话';
  }
  function saveHeight() {
    try { win.localStorage.setItem(KEY, String(height)); } catch {}
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
    for (const ancestor of active.ancestors) ancestor.removeAttribute('data-doc-focus-ancestor');
    toolbar.remove();
    active = null;
    for (const prop of ['--doc-focus-height', '--doc-focus-reserved', '--doc-focus-bottom']) doc.documentElement.style.removeProperty(prop);
  }
  function visible(el) {
    return el.getClientRects().length > 0 && (!el.checkVisibility || el.checkVisibility({ checkVisibilityCSS: true }));
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
  function toggleExpand() {
    height = isExpanded() ? compactHeight() : expandedHeight();
    measure();
    saveHeight();
  }
  const observer = new win.MutationObserver(records => {
    if (records.every(record => {
      if (record.type === 'attributes') return record.target === doc.documentElement;
      // Ignore streaming, browser frames and our own toolbar changes when the two owners survive.
      return active?.panel.isConnected && active.chat.isConnected &&
        (active.chat.contains(record.target) || active.panel.contains(record.target) || toolbar.contains(record.target));
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
  expand.addEventListener('click', toggleExpand);
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

function apply(ctx) {
  ctx.effect(() => mount(document, window, STYLE));
}

    return { apply };
  }
});
