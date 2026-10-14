import test from 'node:test';
import assert from 'node:assert/strict';
import { Controls } from '../src/input.js';

function fixture() {
  const saved = Object.fromEntries(['window', 'document', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let modal = null, palettes = 0, pauses = 0;
  class Element {
    constructor(action) {
      this.dataset = { action }; this.listeners = {}; this.classes = new Set(); this.vars = {};
      this.style = { setProperty: (key, value) => { this.vars[key] = value; } };
      this.classList = { add: key => this.classes.add(key), remove: key => this.classes.delete(key) };
    }
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
    setPointerCapture() {}
    emit(type, pointerId, extra = {}) { for (const listener of this.listeners[type] || []) listener({ pointerId, pointerType: 'touch', preventDefault() {}, ...extra }); }
  }
  const actions = Object.fromEntries(['attack', 'jump', 'dash', 'power'].map(action => [action, new Element(action)]));
  const gear = new Element(), pause = new Element(), feedback = new Element(), surface = new Element();
  surface.querySelector = selector => ({ '#touch-gear': gear, '#touch-pause': pause, '#touch-feedback': feedback })[selector] || null;
  surface.querySelectorAll = () => Object.values(actions);
  surface.dispatchEvent = () => { palettes++; modal = { id: 'catalogue', querySelectorAll: () => [] }; };
  const win = new Element(), doc = new Element();
  doc.querySelector = () => modal; doc.querySelectorAll = () => Object.values(actions);
  for (const [key, value] of Object.entries({ window: win, document: doc, navigator: { getGamepads: () => [] } })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const controls = new Controls(surface, () => pauses++, () => {}, () => {});
  return { controls, actions, surface, gear, pause, feedback, win,
    get palettes() { return palettes; }, get pauses() { return pauses; },
    setModal(value) { modal = value; },
    elapsed(id, ms) { controls.pressTimes.set(id, performance.now() - ms); },
    restore() { for (const [key, descriptor] of Object.entries(saved)) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; },
  };
}

test('held fire and thrust communicate their mode and reset on independent release', () => {
  const f = fixture();
  try {
    f.actions.attack.emit('pointerdown', 1); assert.equal(f.controls.read().slashPressed, true); assert.equal(f.actions.attack.dataset.phase, 'press');
    f.actions.jump.emit('pointerdown', 2); assert.equal(f.controls.read().jumpPressed, true);
    f.elapsed(1, 150); f.elapsed(2, 370);
    const input = f.controls.read(); assert.equal(input.shoot, true); assert.equal(input.jet, true); assert.equal(input.slashPressed, false);
    assert.equal(f.actions.attack.dataset.phase, 'hold'); assert.equal(f.actions.jump.dataset.phase, 'hold');
    assert.equal(f.actions.jump.vars['--hold-progress'], '360deg');
    f.actions.attack.emit('pointerup', 1); assert.equal(f.actions.attack.dataset.phase, 'idle'); assert.equal(f.controls.read().shoot, false); assert.equal(f.controls.read().jet, true);
    assert.equal(f.feedback.textContent, 'JET THRUST');
    f.actions.jump.emit('pointerup', 2); assert.equal(f.actions.jump.dataset.phase, 'idle'); assert.equal(f.feedback.textContent, '');
  } finally { f.restore(); }
});

test('a second finger on a held button does not erase the held mode or duplicate its edge', () => {
  const f = fixture();
  try {
    f.actions.attack.emit('pointerdown', 1); f.controls.read(); f.elapsed(1, 200);
    f.actions.attack.emit('pointerdown', 2); const input = f.controls.read(); assert.equal(input.shoot, true); assert.equal(input.slashPressed, false); assert.equal(f.actions.attack.dataset.phase, 'hold');
    f.actions.attack.emit('pointerup', 2); assert.equal(f.controls.read().shoot, true); assert.equal(f.actions.attack.dataset.phase, 'hold');
    f.actions.attack.emit('pointercancel', 1); assert.equal(f.controls.read().shoot, false); assert.equal(f.actions.attack.dataset.phase, 'idle');
  } finally { f.restore(); }
});

test('power uses the context shown at press, even if movement changes proximity before release', () => {
  const f = fixture();
  try {
    f.surface.dataset.interact = 'true'; f.actions.power.emit('pointerdown', 1); f.surface.dataset.interact = 'false'; f.actions.power.emit('pointerup', 1);
    let input = f.controls.read(); assert.equal(input.interactPressed, true); assert.equal(input.spellPressed, false);
    f.actions.power.emit('pointerdown', 2); f.surface.dataset.interact = 'true'; f.actions.power.emit('pointerup', 2);
    input = f.controls.read(); assert.equal(input.spellPressed, true); assert.equal(input.interactPressed, false);
    assert.equal(f.controls.pressContexts.size, 0);
  } finally { f.restore(); }
});

test('explicit gear shortcut clears both fingers and cannot cast on their later release', () => {
  const f = fixture();
  try {
    f.actions.jump.emit('pointerdown', 1); f.actions.power.emit('pointerdown', 2);
    f.gear.emit('click'); assert.equal(f.palettes, 1); assert.equal(f.controls.pointers.size, 0); assert.equal(f.controls.pressContexts.size, 0);
    assert.equal(f.actions.jump.dataset.phase, 'idle'); assert.equal(f.actions.power.dataset.phase, 'idle');
    f.setModal(null); f.actions.jump.emit('pointerup', 1); f.actions.power.emit('pointerup', 2);
    const input = f.controls.read(); assert.equal(input.spellPressed, false); assert.equal(input.jumpHeld, false); assert.equal(input.jet, false);
  } finally { f.restore(); }
});

test('secondary touch opens pause or gear once while keyboard activation remains available', () => {
  const f = fixture();
  try {
    f.actions.attack.emit('pointerdown', 1); f.elapsed(1, 180);
    assert.equal(f.controls.read().shoot, true);
    f.pause.emit('pointerdown', 2); assert.equal(f.pauses, 1); assert.equal(f.controls.read().shoot, false);
    f.pause.emit('click', 2, { detail: 1 }); assert.equal(f.pauses, 1, 'Compatibility touch click cannot resume immediately');
    f.pause.emit('click', undefined, { detail: 0, pointerType: '' }); assert.equal(f.pauses, 2, 'Keyboard click still works');
    f.actions.jump.emit('pointerdown', 3); f.actions.power.emit('pointerdown', 4);
    f.gear.emit('pointerdown', 5); assert.equal(f.palettes, 1); assert.equal(f.controls.pointers.size, 0);
    f.gear.emit('click', 5, { detail: 1 }); assert.equal(f.palettes, 1);
    f.setModal(null); f.actions.power.emit('pointerup', 4);
    assert.equal(f.controls.read().spellPressed, false);
    f.gear.emit('click', undefined, { detail: 0, pointerType: '' }); assert.equal(f.palettes, 2);
  } finally { f.restore(); }
});

test('blur and modal interruption clear hold feedback, keys and pending power without release edges', () => {
  const f = fixture();
  try {
    f.actions.attack.emit('pointerdown', 1); f.elapsed(1, 180); f.controls.read(); f.actions.power.emit('pointerdown', 2); f.controls.keys.add('KeyD');
    f.win.emit('blur'); assert.equal(f.pauses, 1); assert.equal(f.feedback.textContent, ''); assert.equal(f.actions.attack.dataset.phase, 'idle');
    f.actions.attack.emit('pointerup', 1); f.actions.power.emit('pointerup', 2);
    let input = f.controls.read(); assert.equal(input.shoot, false); assert.equal(input.move, 0); assert.equal(input.spellPressed, false);
    f.actions.power.emit('pointerdown', 3); f.setModal({ id: 'catalogue', querySelectorAll: () => [] }); f.controls.read();
    f.setModal(null); f.actions.power.emit('pointerup', 3); input = f.controls.read(); assert.equal(input.spellPressed, false); assert.equal(f.controls.pressContexts.size, 0);
  } finally { f.restore(); }
});
