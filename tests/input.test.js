import test from 'node:test';
import assert from 'node:assert/strict';
import { Controls, stickValue } from '../src/input.js';

function fixture() {
  const saved = Object.fromEntries(['window','document','navigator','setTimeout','clearTimeout'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let modal = null, clock = 0, nextTimer = 0, paused = 0, palettes = 0;
  const timers = new Map(), stage = { dataset: { mode: 'playing' } };
  class Element {
    constructor(kind = 'free', action) { this.kind = kind; this.dataset = { action }; this.listeners = {}; this.style = {}; this.classes = new Set(); this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) }; }
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
    setPointerCapture() {}
    closest(selector) { return selector === '#stage' ? stage : ['button','menu','dialog'].includes(this.kind) ? this : null; }
    querySelector() { return this.thumb; }
    getBoundingClientRect() { return { left: 0, top: 368, width: this.kind === 'surface' ? 844 : 112, height: 112 }; }
    emit(type, id, x = 240, y = 300, pointerType = 'touch') {
      const event = { target: this, pointerId: id, clientX: x, clientY: y, pointerType, preventDefault() {} };
      for (const listener of this.listeners[type] || []) listener(event);
      for (const listener of doc.listeners[type] || []) listener(event);
    }
  }
  const free = new Element(), menu = new Element('menu'), stick = new Element(), surface = new Element('surface'); stick.thumb = new Element();
  const actions = Object.fromEntries(['jump','dash','attack','power'].map(action => [action, new Element('button', action)]));
  surface.querySelector = id => id === '#joystick' ? stick : null; surface.querySelectorAll = () => Object.values(actions); surface.dispatchEvent = () => palettes++;
  const doc = { listeners: {}, hidden: false, addEventListener: Element.prototype.addEventListener, querySelector: () => modal, querySelectorAll: () => [stick, ...Object.values(actions)] };
  const win = { listeners: {}, addEventListener: Element.prototype.addEventListener };
  for (const [key, value] of Object.entries({ window: win, document: doc, navigator: { getGamepads: () => [] }, setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, due: clock + delay, delay }); return id; }, clearTimeout: id => timers.delete(id) })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const controls = new Controls(surface, () => paused++, () => {}, () => {});
  return { controls, actions, stick, surface, stage, free, menu, timers,
    get palettes() { return palettes; }, get paused() { return paused; },
    setModal(value) { modal = value; }, blur() { for (const listener of win.listeners.blur || []) listener(); },
    advance(ms) { clock += ms; for (const [id, timer] of timers) if (timer.due <= clock) { timers.delete(id); timer.callback(); } },
    restore() { for (const [key, descriptor] of Object.entries(saved)) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; },
  };
}

test('analogue joystick has a deadzone, clamped travel and continuous direction', () => {
  assert.equal(stickValue(3, 4, 50).x, 0); assert.equal(stickValue(100, 0, 50).x, 1); assert.equal(stickValue(-100, 0, 50).x, -1);
  const diagonal = stickValue(100, -100, 50);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10);
  assert.ok(Math.abs(Math.hypot(diagonal.thumbX, diagonal.thumbY) - 50) < 1e-10);
  assert.ok(stickValue(25, 0, 50).x > 0 && stickValue(25, 0, 50).x < 1);
});

test('floating stick begins at zero wherever pressed and keeps one fixed origin', () => {
  const f = fixture();
  try {
    assert.equal(f.stick.hidden, true);
    f.free.emit('pointerdown', 1, 240, 300); assert.equal(f.controls.read().move, 0); assert.equal(f.stick.hidden, false);
    assert.deepEqual(f.controls.stickOrigin, { x: 240, y: 300 }); assert.equal(f.stick.style.left, '184px'); assert.equal(f.stick.style.top, '-124px');
    f.free.emit('pointermove', 1, 300, 300); assert.equal(f.controls.read().move, 1); assert.equal(f.stick.style.left, '184px');
    f.free.emit('pointerdown', 2, 700, 400); assert.deepEqual(f.controls.stickOrigin, { x: 240, y: 300 });
    f.actions.jump.emit('pointerdown', 2); assert.equal(f.controls.read().jumpPressed, true); assert.equal(f.controls.read().move, 1);
    f.actions.jump.emit('pointerup', 2); assert.equal(f.controls.read().jumpHeld, false); assert.equal(f.controls.read().move, 1);
    f.free.emit('pointerup', 1); assert.equal(f.controls.read().move, 0); assert.equal(f.stick.hidden, false); assert.equal([...f.timers.values()][0].delay, 8000);
    f.free.emit('lostpointercapture', 1); assert.equal(f.timers.size, 1); f.advance(7999); assert.equal(f.stick.hidden, false); f.advance(1); assert.equal(f.stick.hidden, true);
    f.free.emit('pointerdown', 3, 70, 440); assert.deepEqual(f.controls.stickOrigin, { x: 70, y: 440 }); assert.equal(f.controls.read().move, 0);
    f.free.emit('pointermove', 3, 70, 490); assert.equal(f.controls.read().down, true); f.free.emit('pointerup', 3); f.advance(7000);
    f.free.emit('pointerdown', 4, 200, 150); assert.equal(f.stick.hidden, false); f.advance(9000); assert.equal(f.stick.hidden, false);
    f.free.emit('pointercancel', 4); assert.equal(f.controls.stickPointer, null); assert.equal(f.controls.read().aimUp, false);
    f.controls.clear(); assert.equal(f.stick.hidden, true); assert.equal(f.timers.size, 0);
  } finally { f.restore(); }
});

test('floating stick excludes actions, menus, dialogs and inactive gameplay', () => {
  const f = fixture();
  try {
    f.actions.attack.emit('pointerdown', 1); assert.equal(f.controls.stickPointer, null); assert.equal(f.controls.read().slashPressed, true);
    f.actions.attack.emit('pointerup', 1); assert.equal(f.controls.read().slashPressed, false);
    f.menu.emit('pointerdown', 2); assert.equal(f.controls.stickPointer, null);
    f.setModal({ id: 'catalogue', querySelectorAll: () => [] }); f.free.emit('pointerdown', 3); assert.equal(f.controls.stickPointer, null); f.setModal(null);
    f.stage.dataset.mode = 'paused'; f.free.emit('pointerdown', 4); assert.equal(f.controls.stickPointer, null); f.stage.dataset.mode = 'playing';
    f.surface.hidden = true; f.free.emit('pointerdown', 5); assert.equal(f.controls.stickPointer, null); f.surface.hidden = false;
    f.free.emit('pointerdown', 6, 200, 300, 'mouse'); assert.equal(f.controls.stickPointer, null);
    f.free.emit('pointerdown', 7); f.free.emit('pointermove', 7, 300, 300); f.actions.attack.emit('pointerdown', 8); f.blur();
    assert.equal(f.paused, 1); assert.equal(f.controls.read().move, 0); assert.equal(f.controls.read().shoot, false); assert.equal(f.stick.hidden, true);
    f.free.emit('pointerup', 7); f.actions.attack.emit('pointerup', 8); assert.equal(f.controls.read().slashPressed, false); assert.equal(f.timers.size, 0);
  } finally { f.restore(); }
});

test('immediate slash, prompt held fire, thrust and deferred power preserve independent fingers', () => {
  const f = fixture(), c = f.controls, a = f.actions;
  try {
    a.attack.emit('pointerdown', 1); assert.equal(c.read().slashPressed, true); assert.equal(c.read().slashPressed, false); assert.equal(c.read().shoot, false);
    c.pressTimes.set(1, performance.now() - 125); assert.equal(c.read().shoot, true); a.attack.emit('pointerup', 1); assert.equal(c.read().shoot, false); assert.equal(c.read().slashPressed, false);
    a.jump.emit('pointerdown', 2); assert.equal(c.read().jumpPressed, true); assert.equal(c.read().jet, false); c.pressTimes.set(2, performance.now() - 360); assert.equal(c.read().jet, true); a.jump.emit('pointerup', 2); assert.equal(c.read().jet, false);
    a.power.emit('pointerdown', 3); assert.equal(c.read().spellPressed, false); a.power.emit('pointerup', 3); assert.equal(c.read().spellPressed, true);
    f.surface.dataset.interact = 'true'; a.power.emit('pointerdown', 4); a.power.emit('pointerup', 4); assert.equal(c.read().interactPressed, true);
    a.power.emit('pointerdown', 5); c.pressTimes.set(5, performance.now() - 460); assert.equal(c.read().spellPressed, false); assert.equal(f.palettes, 1); c.read(); assert.equal(f.palettes, 1); a.power.emit('pointerup', 5); assert.equal(c.read().interactPressed, false);
    a.power.emit('pointerdown', 6); a.power.emit('pointercancel', 6); assert.equal(c.read().interactPressed, false);
    a.power.emit('pointerdown', 7); f.setModal({ id: 'catalogue', querySelectorAll: () => [] }); assert.equal(c.read().spellPressed, false); f.setModal(null); a.power.emit('pointerup', 7); assert.equal(c.read().interactPressed, false);
    a.jump.emit('pointerdown', 8); a.jump.emit('pointerdown', 9); a.jump.emit('pointerup', 8); assert.equal(c.read().jumpHeld, true); a.jump.emit('pointerup', 9); assert.equal(c.read().jumpHeld, false);
  } finally { f.restore(); }
});
