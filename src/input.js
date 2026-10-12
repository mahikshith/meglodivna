export class Controls {
  constructor(element, onPause, onRetry, onConfirm) {
    this.keys = new Set(); this.edges = new Set(); this.touch = new Set(); this.pointers = new Map(); this.padLast = {};
    const captured = ['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyJ','KeyK','KeyL','KeyE','KeyQ','KeyF','KeyC','KeyV','KeyX','KeyZ'];
    window.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName) || e.target.isContentEditable || document.querySelector('dialog[open]')) return;
      if (captured.includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.edges.add(e.code); if (e.code === 'Escape') onPause(); if (e.code === 'KeyR') onRetry(); }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.clear(); onPause(true); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.clear(); onPause(true); } });
    for (const button of element.querySelectorAll('[data-action]')) {
      button.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault(); button.setPointerCapture(e.pointerId); const action = button.dataset.action;
        this.pointers.set(e.pointerId, action);
        if (!this.touch.has(action)) this.edges.add(action);
        this.touch.add(action); button.classList.add('active');
      });
      for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, e => {
        const action = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId);
        if (action && ![...this.pointers.values()].includes(action)) { this.touch.delete(action); button.classList.remove('active'); }
      });
    }
    this.onPause = onPause;
    this.onConfirm = onConfirm;
  }
  clear() { this.keys.clear(); this.edges.clear(); this.touch.clear(); this.pointers.clear(); document.querySelectorAll('.touch .active').forEach(el => el.classList.remove('active')); }
  read(consume = true) {
    const modal = document.querySelector('dialog[open]');
    const held = (...codes) => !modal && codes.some(c => this.keys.has(c) || this.touch.has(c));
    const edge = (...codes) => !modal && codes.some(c => this.edges.has(c));
    const pad = Array.from(navigator.getGamepads?.() || []).find(p => p?.connected);
    const rawButton = i => !!pad?.buttons[i]?.pressed;
    const button = i => !modal && rawButton(i);
    const padEdge = i => button(i) && !this.padLast[i];
    if (modal) {
      if (rawButton(0) && !this.padLast[0]) document.activeElement?.click?.();
      if (rawButton(9) && !this.padLast[9] && modal.id === 'catalogue') modal.close();
      if (rawButton(14) && !this.padLast[14] || rawButton(15) && !this.padLast[15]) {
        const choices = [...modal.querySelectorAll('button:not(:disabled),select')], index = choices.indexOf(document.activeElement);
        choices[(index + (rawButton(14) ? choices.length - 1 : 1)) % choices.length]?.focus();
      }
    } else {
      if (padEdge(9)) this.onPause();
      if (padEdge(0)) this.onConfirm();
    }
    const axis = !modal && Math.abs(pad?.axes[0] || 0) > 0.2 ? pad.axes[0] : 0;
    const input = { move: held('KeyA','ArrowLeft','left') ? -1 : held('KeyD','ArrowRight','right') ? 1 : axis,
      jumpPressed: edge('Space','jump') || padEdge(0), jumpHeld: held('Space','jump') || button(0),
      dashPressed: edge('ShiftLeft','ShiftRight','dash') || padEdge(1), jet: held('KeyL','KeyE','jet') || button(5),
      slashPressed: edge('KeyJ','slash') || padEdge(2), shoot: held('KeyK','shoot') || button(7),
      aimUp: held('KeyW','ArrowUp','aimUp') || !modal && (pad?.axes[1] || 0) < -0.55,
      down: held('KeyS','ArrowDown','down') || !modal && (pad?.axes[1] || 0) > 0.55,
      spellPressed: edge('KeyQ','spell') || padEdge(6), interactPressed: edge('KeyF','interact') || padEdge(3),
      cycleGunPressed: edge('KeyC','cycleGun') || padEdge(4), cycleSwordPressed: edge('KeyV','cycleSword') || padEdge(14),
      cycleSpellPressed: edge('KeyX','cycleSpell') || padEdge(15), ultimatePressed: edge('KeyZ','ultimate') || padEdge(11) };
    if (consume) { this.edges.clear(); for (const i of [0,1,2,3,4,6,9,11,14,15]) this.padLast[i] = rawButton(i); }
    return input;
  }
}
