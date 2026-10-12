export class Controls {
  constructor(element, onPause, onRetry, onConfirm) {
    this.keys = new Set(); this.edges = new Set(); this.touch = new Set(); this.padLast = {};
    const captured = ['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyJ','KeyK','KeyL','KeyE'];
    window.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
      if (captured.includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.edges.add(e.code); if (e.code === 'Escape') onPause(); if (e.code === 'KeyR') onRetry(); }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.clear(); onPause(true); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.clear(); onPause(true); } });
    for (const button of element.querySelectorAll('[data-action]')) {
      button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); const action = button.dataset.action;
        if (!this.touch.has(action)) this.edges.add(action); this.touch.add(action); button.classList.add('active'); });
      for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, () => { this.touch.delete(button.dataset.action); button.classList.remove('active'); });
    }
    this.onPause = onPause;
    this.onConfirm = onConfirm;
  }
  clear() { this.keys.clear(); this.edges.clear(); this.touch.clear(); document.querySelectorAll('.touch .active').forEach(el => el.classList.remove('active')); }
  read(consume = true) {
    const held = (...codes) => codes.some(c => this.keys.has(c) || this.touch.has(c));
    const edge = (...codes) => codes.some(c => this.edges.has(c));
    const pad = Array.from(navigator.getGamepads?.() || []).find(p => p?.connected);
    const button = i => !!pad?.buttons[i]?.pressed;
    const padEdge = i => button(i) && !this.padLast[i];
    if (padEdge(9)) this.onPause();
    if (padEdge(0)) this.onConfirm();
    const axis = Math.abs(pad?.axes[0] || 0) > 0.2 ? pad.axes[0] : 0;
    const input = { move: held('KeyA','ArrowLeft','left') ? -1 : held('KeyD','ArrowRight','right') ? 1 : axis,
      jumpPressed: edge('Space','jump') || padEdge(0), jumpHeld: held('Space','jump') || button(0),
      dashPressed: edge('ShiftLeft','ShiftRight','dash') || padEdge(1), jet: held('KeyL','KeyE','jet') || button(5),
      slashPressed: edge('KeyJ','slash') || padEdge(2), shoot: held('KeyK','shoot') || button(7),
      aimUp: held('KeyW','ArrowUp') || (pad?.axes[1] || 0) < -0.55, down: held('KeyS','ArrowDown') || (pad?.axes[1] || 0) > 0.55 };
    if (consume) { this.edges.clear(); for (const i of [0,1,2,9]) this.padLast[i] = button(i); }
    return input;
  }
}
