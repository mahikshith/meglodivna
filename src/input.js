export function stickValue(dx, dy, radius, deadzone = 0.15) {
  const distance = Math.hypot(dx, dy), scale = distance > radius ? radius / distance : 1;
  const x = dx * scale / radius, y = dy * scale / radius, length = Math.hypot(x, y);
  if (length <= deadzone) return { x: 0, y: 0, thumbX: dx * scale, thumbY: dy * scale };
  const strength = (Math.min(1, length) - deadzone) / (1 - deadzone);
  return { x: x / length * strength, y: y / length * strength, thumbX: dx * scale, thumbY: dy * scale };
}
// Decide the burst on release: a held flight must not first spend18fuel and
// flatten the vertical velocity with a horizontal dash.
const BOOST_HOLD_MS = 160;
const boostKeys = ['ShiftLeft', 'ShiftRight'];

export class Controls {
  constructor(element, onPause, onRetry, onConfirm) {
    this.keys = new Set(); this.edges = new Set(); this.touch = new Set(); this.pointers = new Map(); this.padLast = {};
    this.stick = { x: 0, y: 0 }; this.stickPointer = null; this.stickElement = element.querySelector('#joystick');
    this.aim = null; this.aimOrigins = new Map();
    this.boostTouchStarted = null; this.boostKeyStarted = null; this.boostPadStarted = null;
    this.boostTouchCancelled = false;
    this.stickOrigin = null; this.stickHideTimer = null;
    this.pressTimes = new Map(); this.pressContexts = new Map(); this.paletteOpened = new Set(); this.element = element;
    this.actionButtons = new Map([...element.querySelectorAll('[data-action]')].map(button => [button.dataset.action, button]));
    this.feedback = element.querySelector('#touch-feedback');
    for (const [selector, activate] of [['#touch-pause', onPause], ['#touch-settings', () => element.dispatchEvent(new Event('open-settings'))], ['#touch-gear', () => element.dispatchEvent(new Event('open-loadout'))]]) {
      const button = element.querySelector(selector); if (!button) continue;
      let touchActivation = -Infinity;
      // Secondary fingers do not reliably synthesize clicks while another action is held.
      button.addEventListener('pointerdown', event => {
        if (!['touch', 'pen'].includes(event.pointerType)) return;
        event.preventDefault(); touchActivation = performance.now(); this.clear(); activate();
      });
      button.addEventListener('click', event => {
        const fromTouch = ['touch', 'pen'].includes(event.pointerType) || event.sourceCapabilities?.firesTouchEvents;
        if (event.detail !== 0 && fromTouch && performance.now() - touchActivation < 800) { event.preventDefault(); return; }
        this.clear(); activate();
      });
    }
    const captured = ['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyJ','KeyK','KeyL','KeyE','KeyQ','KeyF','KeyC','KeyV','KeyX','KeyZ'];
    window.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName) || e.target.isContentEditable || document.querySelector('dialog[open]')) return;
      if (captured.includes(e.code)) e.preventDefault();
      if (boostKeys.includes(e.code) && !boostKeys.some(key => this.keys.has(key))) this.boostKeyStarted = performance.now();
      if (!e.repeat) { this.edges.add(e.code); if (e.code === 'Escape') onPause(); if (e.code === 'KeyR') onRetry(); }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
      if (boostKeys.includes(e.code) && !boostKeys.some(key => this.keys.has(key))) {
        if (this.boostKeyStarted !== null && performance.now() - this.boostKeyStarted < BOOST_HOLD_MS && !document.querySelector('dialog[open]')) this.edges.add('boost');
        this.boostKeyStarted = null;
      }
    });
    window.addEventListener('blur', () => { this.clear(); onPause(true); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.clear(); onPause(true); } });
    if (this.stickElement) {
      const stick = this.stickElement, thumb = stick.querySelector('.joystick-thumb');
      stick.hidden = true;
      const move = e => {
        if (e.pointerId !== this.stickPointer || !this.stickOrigin) return;
        e.preventDefault(); const rect = stick.getBoundingClientRect();
        const value = stickValue(e.clientX - this.stickOrigin.x, e.clientY - this.stickOrigin.y, Math.max(16, rect.width * 0.34));
        this.stick = value; thumb.style.transform = `translate(${value.thumbX}px,${value.thumbY}px)`;
      };
      document.addEventListener('pointerdown', e => {
        const stage = element.closest('#stage');
        if (this.stickPointer !== null || !['touch','pen'].includes(e.pointerType) || element.hidden || stage?.dataset.mode !== 'playing'
          || e.target.closest('#stage') !== stage || e.target.closest('button,a,input,select,textarea,dialog,#menu,[data-action]') || document.querySelector('dialog[open]')) return;
        e.preventDefault(); clearTimeout(this.stickHideTimer); this.stickHideTimer = null;
        this.stickPointer = e.pointerId; this.stickOrigin = { x: e.clientX, y: e.clientY }; this.stick = { x: 0, y: 0 };
        const surface = element.getBoundingClientRect(); stick.hidden = false;
        const rect = stick.getBoundingClientRect(); stick.style.left = `${e.clientX - surface.left - rect.width / 2}px`; stick.style.top = `${e.clientY - surface.top - rect.height / 2}px`;
        thumb.style.transform = ''; stick.setPointerCapture(e.pointerId); stick.classList.add('active');
      });
      document.addEventListener('pointermove', move);
      for (const event of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(event, e => {
        if (e.pointerId !== this.stickPointer) return;
        this.stickPointer = null; this.stickOrigin = null; this.stick = { x: 0, y: 0 }; thumb.style.transform = ''; stick.classList.remove('active');
        clearTimeout(this.stickHideTimer); this.stickHideTimer = setTimeout(() => { stick.hidden = true; this.stickHideTimer = null; }, 8000);
      });
    }
    for (const button of element.querySelectorAll('[data-action]')) {
      button.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (document.querySelector('dialog[open]')) return;
        e.preventDefault(); button.setPointerCapture(e.pointerId); const action = button.dataset.action;
        this.pointers.set(e.pointerId, action);
        if (action === 'attack') this.aimOrigins.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this.pressTimes.set(e.pointerId, performance.now());
        if (action === 'boost' && !this.touch.has(action)) {
          this.boostTouchStarted = performance.now(); this.boostTouchCancelled = false;
        }
        if (action === 'power') this.pressContexts.set(e.pointerId, this.element.dataset.interact === 'true' ? 'interact' : 'spell');
        if (!this.touch.has(action) && !['power', 'boost'].includes(action)) this.edges.add(action === 'attack' ? 'slash' : action);
        this.touch.add(action); button.classList.add('active'); this.paintAction(action, 0);
      });
      button.addEventListener('pointermove', e => {
        const origin = this.aimOrigins.get(e.pointerId);
        if (!origin || !Number.isFinite(e.clientX) || !Number.isFinite(origin.x)) return;
        const dx = e.clientX - origin.x, dy = e.clientY - origin.y, length = Math.hypot(dx, dy);
        if (length > 12) this.aim = { x: dx / length, y: dy / length };
      });
      for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, e => {
        const action = this.pointers.get(e.pointerId), duration = performance.now() - (this.pressTimes.get(e.pointerId) ?? 0), opened = this.paletteOpened.has(e.pointerId), context = this.pressContexts.get(e.pointerId);
        this.pointers.delete(e.pointerId); this.pressTimes.delete(e.pointerId); this.pressContexts.delete(e.pointerId); this.paletteOpened.delete(e.pointerId);
        this.aimOrigins.delete(e.pointerId);
        if (![...this.pointers.values()].includes('attack')) this.aim = null;
        if (action === 'boost') {
          if (event !== 'pointerup') this.boostTouchCancelled = true;
          if (![...this.pointers.values()].includes(action)) {
            if (!this.boostTouchCancelled && this.boostTouchStarted !== null && performance.now() - this.boostTouchStarted < BOOST_HOLD_MS && !document.querySelector('dialog[open]')) this.edges.add('boost');
            this.boostTouchStarted = null;
          }
        }
        if (event === 'pointerup' && !document.querySelector('dialog[open]') && ![...this.pointers.values()].includes(action)) {
          if (action === 'power' && duration < 450 && !opened) this.edges.add(context);
        }
        if (action && ![...this.pointers.values()].includes(action)) { this.touch.delete(action); button.classList.remove('active'); this.paintAction(action); }
      });
    }
    this.onPause = onPause;
    this.onConfirm = onConfirm;
  }
  paintAction(action, elapsed) {
    const button = this.actionButtons.get(action); if (!button) return;
    const threshold = { attack: 120, jump: 350, boost: BOOST_HOLD_MS, power: 450 }[action];
    button.dataset.phase = elapsed === undefined ? 'idle' : threshold && elapsed >= threshold ? 'hold' : 'press';
    button.style.setProperty?.('--hold-progress', elapsed === undefined || !threshold ? '0deg' : `${Math.min(1, elapsed / threshold) * 360}deg`);
    if (this.feedback) {
      const held = [...this.actionButtons].find(([, item]) => item.dataset.phase === 'hold');
      this.feedback.textContent = held ? { attack: 'FIRING · DRAG TO AIM', jump: 'JET THRUST', boost: 'JET THRUST', power: 'OPENING GEAR' }[held[0]] : '';
    }
  }
  clear() {
    this.boostTouchStarted = null; this.boostKeyStarted = null; this.boostPadStarted = null; this.boostTouchCancelled = false;
    this.aim = null; this.aimOrigins.clear();
    this.keys.clear(); this.edges.clear(); this.touch.clear(); this.pointers.clear(); this.pressTimes.clear(); this.pressContexts.clear(); this.paletteOpened.clear(); this.stickPointer = null; this.stickOrigin = null; this.stick = { x: 0, y: 0 };
    clearTimeout(this.stickHideTimer); this.stickHideTimer = null; if (this.stickElement) this.stickElement.hidden = true;
    const thumb = this.stickElement?.querySelector('.joystick-thumb'); if (thumb) thumb.style.transform = '';
    document.querySelectorAll('.touch .active').forEach(el => el.classList.remove('active'));
    for (const action of this.actionButtons.keys()) this.paintAction(action);
  }
  read(consume = true) {
    let modal = document.querySelector('dialog[open]');
    if (modal) this.clear();
    const heldFor = (action, milliseconds) => !modal && [...this.pointers].some(([id, value]) => value === action && performance.now() - this.pressTimes.get(id) >= milliseconds);
    if (!modal) for (const action of this.touch) {
      let elapsed = 0;
      for (const [id, value] of this.pointers) if (value === action) elapsed = Math.max(elapsed, performance.now() - this.pressTimes.get(id));
      if (action === 'boost' && this.boostTouchStarted !== null) elapsed = performance.now() - this.boostTouchStarted;
      this.paintAction(action, elapsed);
    }
    if (!modal) for (const [id, action] of this.pointers) {
      if (action === 'power' && performance.now() - this.pressTimes.get(id) >= 450 && !this.paletteOpened.has(id)) {
        this.paletteOpened.add(id); this.element.dispatchEvent(new Event('open-loadout')); modal = document.querySelector('dialog[open]');
        if (modal) this.clear(); break;
      }
    }
    const held = (...codes) => !modal && codes.some(c => this.keys.has(c) || this.touch.has(c));
    const edge = (...codes) => !modal && codes.some(c => this.edges.has(c));
    const pad = Array.from(navigator.getGamepads?.() || []).find(p => p?.connected);
    const rawButton = i => !!pad?.buttons[i]?.pressed;
    const button = i => !modal && rawButton(i);
    const padEdge = i => button(i) && !this.padLast[i];
    if (button(1) && !this.padLast[1] && this.boostPadStarted === null) this.boostPadStarted = performance.now();
    if (!button(1) && this.boostPadStarted !== null) {
      if (!modal && pad?.connected && performance.now() - this.boostPadStarted < BOOST_HOLD_MS) this.edges.add('boost');
      this.boostPadStarted = null;
    }
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
    const stickX = modal ? 0 : this.stick.x, stickY = modal ? 0 : this.stick.y;
    const rightX = !modal ? pad?.axes[2] || 0 : 0, rightY = !modal ? pad?.axes[3] || 0 : 0;
    const aim = !modal && this.aim || (Math.hypot(rightX, rightY) > .25 ? { x: rightX, y: rightY } : null);
    const input = { move: held('KeyA','ArrowLeft','left') ? -1 : held('KeyD','ArrowRight','right') ? 1 : stickX || axis,
      jumpPressed: edge('Space','jump') || padEdge(0), jumpHeld: held('Space','jump') || button(0),
      boostPressed: edge('boost'), jet: held('KeyL','KeyE','jet') || heldFor('jump',350) || button(5)
        || !modal && [this.boostTouchStarted, this.boostKeyStarted, this.boostPadStarted].some(started => started !== null && performance.now() - started >= BOOST_HOLD_MS),
      slashPressed: edge('KeyJ','slash') || padEdge(2), shoot: held('KeyK','shoot') || heldFor('attack',120) || button(7),
      aimUp: !aim && (held('KeyW','ArrowUp','aimUp') || stickY < -0.55 || !modal && (pad?.axes[1] || 0) < -0.55),
      down: held('KeyS','ArrowDown','down') || stickY > 0.55 || !modal && (pad?.axes[1] || 0) > 0.55,
      aimX: aim?.x ?? (stickX || axis), aimY: aim?.y ?? (stickY || (!modal ? pad?.axes[1] || 0 : 0)),
      independentAim: !!aim,
      spellPressed: edge('KeyQ','spell') || padEdge(6), interactPressed: edge('KeyF','interact') || padEdge(3),
      cycleGunPressed: edge('KeyC','cycleGun') || padEdge(4), cycleSwordPressed: edge('KeyV','cycleSword') || padEdge(14),
      cycleSpellPressed: edge('KeyX','cycleSpell') || padEdge(15), ultimatePressed: edge('KeyZ','ultimate') || padEdge(11) };
    if (consume) { this.edges.clear(); for (const i of [0,1,2,3,4,6,9,11,14,15]) this.padLast[i] = rawButton(i); }
    return input;
  }
}
