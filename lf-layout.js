/* Existing gallery chrome only. No catalog, filter, or card-sizing ownership. */
(function (win) {
  'use strict';
  const doc = win.document;
  const incoming = new URL(win.location.href);
  const groupIDs = ['mainNav', 'flowerNav', 'topicNav', 'tagNav', 'batchNav'];
  const fields = ['q','days','vdays','sort','rpm','pagesize','cols','vmin','vmax','mmin','mmax','vfrom','vto'];
  const detailsIDs = ['ranges', 'lf-options', 'lf-selection'];
  const key = name => 'lf-layout:v1:' + name + ':' + incoming.pathname;
  const prefKey = key('preferences');
  const reloadKey = key('reload');
  const historyKey = 'lfLayoutReloadView';
  const read = (store, k) => { try { return JSON.parse(win[store].getItem(k) || 'null'); } catch { return null; } };
  const write = (store, k, value) => { try { win[store].setItem(k, JSON.stringify(value)); } catch {} };
  const explicit = url => !!url.hash || ['q','view','pageSize','analysis','panel','section','lf'].some(k => url.searchParams.has(k));
  const viewOnly = url => !url.hash && url.searchParams.has('view') && !['q','pageSize','analysis','panel','section','lf'].some(k => url.searchParams.has(k));
  const saved = read('sessionStorage', reloadKey);
  const reload = win.performance.getEntriesByType('navigation')[0]?.type === 'reload';
  const resume = reload && saved?.href === incoming.href && (!explicit(incoming) || (viewOnly(incoming) && saved.internalView && win.history.state?.[historyKey] === incoming.href)) ? saved : null;
  if (resume) try { win.history.scrollRestoration = 'manual'; } catch {}
  const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
  const record = obj => obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  const get = id => doc.getElementById(id);
  const node = (tag, name) => { const el = doc.createElement(tag); if (name) el.className = name; return el; };
  const position = n => Math.max(0, Number(n) || 0);
  let mounted = null;

  function mount(adapter = {}) {
    if (mounted) return mounted;
    const layout = doc.querySelector('.layout');
    const body = layout?.querySelector(':scope > main.body');
    const side = layout?.querySelector(':scope > aside.side');
    if (!body || !side) return null;
    const compact = win.matchMedia('(max-width:610px)');
    const stored = record(read('localStorage', prefKey));
    const prefs = {
      desktopOpen: stored.desktopOpen !== false,
      width: clamp(Number(stored.width) || 248, 164, 480),
      thumbs: stored.thumbs !== false,
      order: record(stored.order), names: record(stored.names)
    };
    let mobileOpen = false, editing = false, rename = null, drag = null, mark = null;
    let sideScroll = 0;
    const persist = () => write('localStorage', prefKey, prefs);
    const groups = groupIDs.map(get).filter(g => g && side.contains(g));
    side.id ||= 'lf-layout-side';

    const tools = node('div', 'lf-layout-tools');
    tools.setAttribute('role', 'group');
    tools.setAttribute('aria-label', '화면 설정');
    tools.innerHTML = '<button type="button" id="lf-layout-toggle"></button><label class="lf-layout-width">메뉴 너비 <input type="range" min="164" max="480" step="1" id="lf-layout-width" aria-label="메뉴 너비"><output for="lf-layout-width"></output></label><label class="lf-layout-thumbs"><input type="checkbox" id="lf-layout-thumbs">썸네일 표시</label>';
    body.prepend(tools);
    const toggle = get('lf-layout-toggle');
    toggle.setAttribute('aria-controls', side.id);
    const slider = get('lf-layout-width');
    const output = tools.querySelector('output');
    const thumbs = get('lf-layout-thumbs');
    thumbs.checked = prefs.thumbs;
    const editBar = node('div', 'lf-menu-editbar');
    editBar.innerHTML = '<button type="button" class="lf-menu-edit">메뉴 편집</button><p id="lf-menu-help" hidden>같은 그룹에서만 이동할 수 있습니다. 끌어 놓거나 ↑/↓ 버튼을 쓰세요. 단축키: Alt+↑/↓, F2(이름).</p><div class="lf-layout-sr" role="status" aria-live="polite"></div>';
    const intro = side.querySelector('.sub') || side.querySelector('h2');
    if (intro) intro.after(editBar); else side.prepend(editBar);
    const edit = editBar.querySelector('button');
    const help = get('lf-menu-help');
    const live = editBar.querySelector('[role=status]');
    edit.setAttribute('aria-pressed', 'false');
    edit.setAttribute('aria-controls', groups.map(g => g.id).join(' '));
    const splitter = node('div', 'lf-layout-splitter');
    splitter.tabIndex = 0;
    splitter.setAttribute('role','separator');
    splitter.setAttribute('aria-label','메뉴 너비 조절');
    splitter.setAttribute('aria-orientation','vertical');
    splitter.setAttribute('aria-controls',side.id);
    splitter.setAttribute('aria-valuemin','164');
    layout.append(splitter);
    const dialog = node('dialog','lf-menu-dialog');
    dialog.setAttribute('aria-labelledby','lf-menu-title');
    dialog.innerHTML = '<form method="dialog"><h2 id="lf-menu-title">메뉴 이름 변경</h2><label>표시 이름 <input maxlength="80" autocomplete="off"></label><p class="lf-menu-note">비워 두면 원래 이름으로 돌아갑니다. 분류·주소는 그대로입니다.</p><div><button value="save">저장</button><button value="cancel">취소</button></div></form>';
    body.append(dialog);
    const nameInput = dialog.querySelector('input');

    function maxWidth() { return clamp(Math.floor(doc.documentElement.clientWidth * .42), 164, 480); }
    function syncWidth() {
      const max = maxWidth(), width = clamp(prefs.width,164,max);
      layout.style.setProperty('--lf-side-width', width + 'px');
      slider.max = String(max);
      slider.value = String(width);
      output.value = width + 'px';
      splitter.setAttribute('aria-valuemax',String(max));
      splitter.setAttribute('aria-valuenow',String(width));
      splitter.setAttribute('aria-valuetext',width + ' 픽셀');
    }
    function setWidth(n) { prefs.width = clamp(Math.round(n),164,maxWidth()); syncWidth(); }
    function syncOpen() {
      const open = compact.matches ? mobileOpen : prefs.desktopOpen;
      if (!open && side.contains(doc.activeElement)) toggle.focus({preventScroll:true});
      if (!side.hidden) sideScroll = side.scrollTop;
      side.hidden = !open;
      layout.classList.toggle('lf-layout-open',open);
      if (open) side.scrollTop = sideScroll;
      splitter.hidden = compact.matches || !open;
      toggle.textContent = open ? '메뉴 접기' : '메뉴 펼치기';
      toggle.setAttribute('aria-expanded',String(open));
    }
    function syncThumbs() { layout.classList.toggle('lf-layout-no-thumbs', !prefs.thumbs); }
    toggle.addEventListener('click', () => {
      if (compact.matches) mobileOpen = !mobileOpen; else { prefs.desktopOpen = !prefs.desktopOpen; persist(); }
      syncOpen();
      if (compact.matches && mobileOpen) edit.focus({preventScroll:true});
    });
    compact.addEventListener('change', () => { mobileOpen = false; syncOpen(); syncWidth(); });
    win.addEventListener('resize',syncWidth, {passive:true});
    thumbs.addEventListener('change', () => { prefs.thumbs = thumbs.checked; syncThumbs(); persist(); });
    slider.addEventListener('input', () => setWidth(Number(slider.value)));
    slider.addEventListener('change',persist);
    let sizing = null;
    splitter.addEventListener('pointerdown', e => {
      if (e.button !== 0 || sizing) return;
      sizing = { id:e.pointerId, x:e.clientX, width:Number(slider.value) };
      splitter.setPointerCapture(e.pointerId);
      layout.classList.add('lf-layout-resizing');
      splitter.focus({preventScroll:true});
      e.preventDefault();
    });
    splitter.addEventListener('pointermove', e => { if (sizing?.id === e.pointerId) setWidth(sizing.width + e.clientX - sizing.x); });
    function stopSizing(e) {
      if (sizing?.id !== e.pointerId) return;
      sizing = null;
      layout.classList.remove('lf-layout-resizing');
      persist();
    }
    for (const type of ['pointerup','pointercancel','lostpointercapture']) splitter.addEventListener(type, stopSizing);
    splitter.addEventListener('keydown', e => {
      const step = e.shiftKey ? 32 : 8, value = Number(slider.value);
      const next = {ArrowLeft:value-step, ArrowRight:value+step, Home:164, End:maxWidth()};
      if (!Object.hasOwn(next,e.key)) return;
      e.preventDefault(); setWidth(next[e.key]); persist();
    });

    const baseLabels = new WeakMap();
    const ownValue = (obj,k) => Object.hasOwn(obj,k) ? obj[k] : undefined;
    const labelMap = g => record(ownValue(prefs.names,g.id));
    const rows = g => Array.from(g.children).filter(row => row.classList.contains('lf-menu-row'));
    const rowID = r => r.dataset.lfMenuKey;
    const main = r => r.querySelector(':scope > button[data-section]');
    function paintLabel(g, row) {
      const b = main(row), base = baseLabels.get(b), alias = ownValue(labelMap(g),rowID(row));
      const title = typeof alias === 'string' && alias.trim() ? alias : base;
      const display = b.querySelector('.lf-menu-name');
      if (display.textContent !== title) display.textContent = title;
      b.title = title;
      const captions = {drag:'끌어서 이동',up:'위로 이동',down:'아래로 이동',rename:'이름 변경'};
      for (const el of row.querySelectorAll('[data-lf-menu-action]')) el.setAttribute('aria-label', title + ' · ' + captions[el.dataset.lfMenuAction]);
    }
    function wrap(g,b) {
      const r = node('div','lf-menu-row');
      r.dataset.lfMenuKey = b.dataset.section;
      const holder = b.querySelector(':scope > span') || b;
      const text = node('span','lf-menu-name');
      baseLabels.set(b,b.title || holder.textContent.trim());
      for (const child of Array.from(holder.childNodes)) if (child.nodeType === 3) child.remove();
      holder.append(text);
      const actions = node('div','lf-menu-actions');
      actions.innerHTML = '<span class="lf-menu-grip" data-lf-menu-action="drag" draggable="true" aria-hidden="true" title="끌어서 이동">⠿</span><button type="button" data-lf-menu-action="up" title="위로 이동">↑</button><button type="button" data-lf-menu-action="down" title="아래로 이동">↓</button><button type="button" data-lf-menu-action="rename" title="이름 변경">이름</button>';
      b.replaceWith(r); r.append(b,actions); paintLabel(g,r);
    }
    function applyOrder(g) {
      for (const b of Array.from(g.children)) if (b.matches('button[data-section]')) wrap(g,b);
      const current = rows(g);
      const order = ownValue(prefs.order,g.id);
      if (Array.isArray(order)) {
        const positions = new Map(order.map((id,i) => [id,i]));
        const desired = [...current].sort((a,b) => (positions.get(rowID(a)) ?? Infinity) - (positions.get(rowID(b)) ?? Infinity));
        for (let i=0; i<desired.length; i++) if (g.children[i] !== desired[i]) g.insertBefore(desired[i],g.children[i] || null);
      }
      const ordered = rows(g);
      for (const [i,r] of ordered.entries()) {
        r.querySelector('[data-lf-menu-action=up]').disabled = i === 0;
        r.querySelector('[data-lf-menu-action=down]').disabled = i === ordered.length-1;
      }
    }
    const observer = new MutationObserver(changes => {
      for (const g of new Set(changes.map(change => change.target))) applyOrder(g);
    });
    function sync() { for (const g of groups) applyOrder(g); syncWidth(); }
    for (const g of groups) { applyOrder(g); observer.observe(g, {childList:true}); }

    function move(row, at, focus) {
      const g = row.parentElement, siblings = rows(g), from = siblings.indexOf(row);
      at = clamp(at,0,siblings.length - 1);
      if (from < 0 || from === at) return;
      siblings.splice(from,1); siblings.splice(at,0,row);
      const nextOrder = siblings.map(rowID);
      const older = ownValue(prefs.order,g.id);
      prefs.order = {...prefs.order, [g.id]:nextOrder.concat(Array.isArray(older) ? older.filter(k => !nextOrder.includes(k)) : [])};
      applyOrder(g); persist();
      if (focus) {
        const replacement = focus.disabled ? main(row) : focus;
        replacement.focus({preventScroll:true}); row.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
      }
      live.textContent = main(row).title + ' · ' + (at+1) + ' / ' + siblings.length;
    }
    function startRename(row, focus) {
      rename = { group:row.parentElement, id:rowID(row), focus };
      nameInput.value = main(row).title;
      dialog.returnValue = '';
      dialog.showModal(); nameInput.select();
    }
    function scrollSide() { if (!side.hidden) sideScroll = side.scrollTop; }
    side.addEventListener('scroll',scrollSide,{passive:true});
    dialog.addEventListener('close', () => {
      if (!rename) return;
      const {group:g,id,focus} = rename; rename = null;
      const row = rows(g).find(r => rowID(r) === id);
      if (!row) { edit.focus({preventScroll:true}); return; }
      if (dialog.returnValue === 'save') {
        const names = {...labelMap(g)}, value = nameInput.value.trim();
        if (value && value !== baseLabels.get(main(row))) Object.defineProperty(names,id,{value,enumerable:true,configurable:true,writable:true});
        else delete names[id];
        prefs.names = {...prefs.names,[g.id]:names};
        paintLabel(g,row); persist();
        live.textContent = main(row).title + ' · 이름 저장됨';
      }
      (focus.isConnected ? focus : main(row)).focus({preventScroll:true});
    });
    function setEditing(on) {
      editing = on; side.classList.toggle('lf-menu-editing', on);
      edit.setAttribute('aria-pressed',String(on)); edit.textContent = on ? '편집 완료' : '메뉴 편집';
      help.hidden = !on;
    }
    side.addEventListener('click', e => {
      if (e.target.closest('.lf-menu-edit')) { setEditing(!editing); return; }
      const row = e.target.closest('.lf-menu-row'), act = e.target.closest('[data-lf-menu-action]');
      if (editing && row && act) {
        const action = act.dataset.lfMenuAction;
        if (action === 'rename') startRename(row,act);
        if (action === 'up' || action === 'down') move(row,rows(row.parentElement).indexOf(row) + (action === 'up' ? -1 : 1),act);
      } else if (compact.matches && !editing && e.target.closest('button[data-section],#lf-repro-link') && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        mobileOpen = false; syncOpen();
      }
    });
    layout.addEventListener('keydown', e => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape' && compact.matches && mobileOpen && !dialog.open) { mobileOpen = false; syncOpen(); e.preventDefault(); return; }
      const b = e.target.closest?.('button[data-section]'), row = b?.closest('.lf-menu-row');
      if (!row || !side.contains(row) || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === 'F2' && !e.altKey) { e.preventDefault(); startRename(row,b); }
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault(); move(row,rows(row.parentElement).indexOf(row) + (e.key === 'ArrowUp' ? -1 : 1),b);
      }
    });
    function clearMark() { if (mark) mark.removeAttribute('data-lf-drop'); mark = null; }
    side.addEventListener('dragstart', e => {
      const handle = e.target.closest('[data-lf-menu-action=drag]');
      if (!editing || !handle || !e.dataTransfer) return;
      const row = handle.closest('.lf-menu-row');
      drag = row; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain',rowID(row));
      e.dataTransfer.setDragImage(row,15,15);
    });
    side.addEventListener('dragover', e => {
      const row = e.target.closest('.lf-menu-row');
      if (!drag || !row || row === drag || row.parentElement !== drag.parentElement) { clearMark(); return; }
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      if (mark !== row) clearMark();
      mark = row;
      const rect = row.getBoundingClientRect();
      row.dataset.lfDrop = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    });
    side.addEventListener('dragleave', e => { if (mark && !mark.contains(e.relatedTarget)) clearMark(); });
    side.addEventListener('drop', e => {
      const row = e.target.closest('.lf-menu-row');
      if (!drag || !row || row !== mark || row.parentElement !== drag.parentElement) { clearMark(); drag = null; return; }
      e.preventDefault();
      const all = rows(row.parentElement).filter(r => r !== drag);
      move(drag,all.indexOf(row) + (row.dataset.lfDrop === 'after' ? 1 : 0),null);
      clearMark(); drag = null;
    });
    side.addEventListener('dragend', () => { clearMark(); drag = null; });

    function nativeRestore(values) {
      let changed = false, colsChanged = false;
      for (const id of fields) {
        const control = get(id), value = values?.[id];
        if (!control || typeof value !== 'string' || control.value === value) continue;
        if (control.options && !Array.from(control.options).some(o => o.value === value)) continue;
        control.value = value;
        if (id === 'cols') colsChanged = true; else changed = true;
      }
      if (colsChanged) get('cols')?.dispatchEvent(new Event('change'));
      if (changed) get('days')?.dispatchEvent(new Event('change'));
    }
    function snapshotForReload() {
      scrollSide();
      const now = new URL(win.location.href);
      const internalView = viewOnly(now) && ((!explicit(incoming) || now.href !== incoming.href) || Boolean(resume?.internalView));
      if (explicit(now) && !internalView) return;
      if (internalView) try { win.history.replaceState({...record(win.history.state),[historyKey]:now.href},''); } catch {}
      const native = Object.fromEntries(fields.map(id => [id,get(id)?.value]));
      const detail = Object.fromEntries(detailsIDs.map(id => [id,get(id)?.open]));
      const groupDetail = Object.fromEntries(groups.map(g => [g.id,g.parentElement.matches('details') ? g.parentElement.open : undefined]));
      let app;
      try { app = adapter.capture?.(); } catch {}
      write('sessionStorage',reloadKey,{href:now.href,internalView,native,app,detail,groupDetail,y:win.scrollY,sideY:sideScroll});
    }
    layout.classList.add('lf-layout-mounted');
    sync(); syncThumbs(); syncOpen();
    if (resume) {
      let restored = false;
      try { if (resume.app !== undefined && typeof adapter.restore === 'function') restored = adapter.restore(resume.app) !== false; } catch {}
      if (!restored) nativeRestore(resume.native);
      for (const id of detailsIDs) if (typeof resume.detail?.[id] === 'boolean' && get(id)) get(id).open = resume.detail[id];
      for (const g of groups) if (typeof resume.groupDetail?.[g.id] === 'boolean' && g.parentElement.matches('details')) g.parentElement.open = resume.groupDetail[g.id];
      win.requestAnimationFrame(() => win.requestAnimationFrame(() => {
        sideScroll = position(resume.sideY); if (!side.hidden) side.scrollTop = sideScroll;
        win.scrollTo({top:position(resume.y),behavior:'instant'});
        try { win.history.scrollRestoration = 'auto'; } catch {}
      }));
    }
    win.addEventListener('pagehide',snapshotForReload);
    doc.addEventListener('visibilitychange',() => { if (doc.visibilityState === 'hidden') snapshotForReload(); });
    mounted = Object.freeze({sync});
    return mounted;
  }
  win.LFLayout = Object.freeze({mount,sync:() => mounted?.sync()});
})(window);
