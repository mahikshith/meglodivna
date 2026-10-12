import test from 'node:test';
import assert from 'node:assert/strict';
import { Controls, stickValue } from '../src/input.js';

test('analogue joystick has a deadzone, clamped travel and continuous direction', () => {
  assert.equal(stickValue(3, 4, 50).x, 0);
  assert.equal(stickValue(100, 0, 50).x, 1);
  assert.equal(stickValue(-100, 0, 50).x, -1);
  const diagonal = stickValue(100, -100, 50);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10);
  assert.ok(Math.abs(Math.hypot(diagonal.thumbX, diagonal.thumbY) - 50) < 1e-10);
  assert.ok(stickValue(25, 0, 50).x > 0 && stickValue(25, 0, 50).x < 1);
});

test('joystick and action fingers release independently; cancel, blur and modal clear state', () => {
  class Element {
    constructor(action) { this.dataset = { action }; this.listeners = {}; this.style = {}; this.classes = new Set(); this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) }; }
    addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
    setPointerCapture() {}
    querySelector() { return this.thumb; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 132, height: 132 }; }
    emit(name, id, x = 66, y = 66) { for (const listener of this.listeners[name] || []) listener({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', preventDefault() {} }); }
  }
  const stick = new Element(), jump = new Element('jump'), shoot = new Element('shoot'), attack = new Element('attack'), power = new Element('power'); stick.thumb = new Element();
  let modal = null, blur, paused = 0;
  const previousWindow = globalThis.window, previousDocument = globalThis.document, previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis.window = { addEventListener(name, listener) { if (name === 'blur') blur = listener; } };
  globalThis.document = { hidden: false, addEventListener() {}, querySelector() { return modal; }, querySelectorAll() { return [stick, jump, shoot]; } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [] } });
  try {
    let palettes = 0; const surface = { dataset: {}, querySelector: id => id === '#joystick' ? stick : null, querySelectorAll: () => [jump, shoot, attack, power], dispatchEvent() { palettes++; } };
    const controls = new Controls(surface, () => paused++, () => {}, () => {});
    stick.emit('pointerdown', 1, 132, 66); jump.emit('pointerdown', 2);
    assert.equal(controls.read().move, 1); assert.equal(controls.read(false).jumpHeld, true);
    jump.emit('pointerup', 2); assert.equal(controls.read().move, 1); assert.equal(controls.read().jumpHeld, false);
    shoot.emit('pointerdown', 3); stick.emit('pointerup', 1); assert.equal(controls.read().move, 0); assert.equal(controls.read().shoot, true);
    shoot.emit('pointercancel', 3); assert.equal(controls.read().shoot, false);
    stick.emit('pointerdown', 4, 66, 0); assert.equal(controls.read().aimUp, true);
    stick.emit('pointerdown', 5, 0, 132); assert.equal(controls.read().move, 0); assert.equal(controls.read().aimUp, true);
    blur(); assert.equal(paused, 1); assert.equal(controls.read().aimUp, false); assert.equal(stick.thumb.style.transform, '');
    stick.emit('pointerdown', 6, 66, 132); jump.emit('pointerdown', 7); assert.equal(controls.read().down, true);
    modal = { id: 'catalogue', querySelectorAll: () => [] }; assert.equal(controls.read().move, 0); assert.equal(controls.read().jumpHeld, false);
    modal = null; assert.equal(controls.read().down, false); assert.equal(controls.read().jumpHeld, false);
    jump.emit('pointerdown', 8); jump.emit('pointerdown', 9); jump.emit('pointerup', 8); assert.equal(controls.read().jumpHeld, true); jump.emit('pointerup', 9); assert.equal(controls.read().jumpHeld, false);
    attack.emit('pointerdown', 10); assert.equal(controls.read().slashPressed, false); attack.emit('pointerup', 10); assert.equal(controls.read().slashPressed, true);
    attack.emit('pointerdown', 11); controls.pressTimes.set(11, performance.now() - 190); assert.equal(controls.read().shoot, true); attack.emit('pointerup', 11); assert.equal(controls.read().slashPressed, false); assert.equal(controls.read().shoot, false);
    jump.emit('pointerdown', 12); assert.equal(controls.read().jumpPressed, true); assert.equal(controls.read().jet, false); controls.pressTimes.set(12, performance.now() - 360); assert.equal(controls.read().jet, true); jump.emit('pointerup', 12); assert.equal(controls.read().jet, false);
    power.emit('pointerdown', 13); assert.equal(controls.read().spellPressed, false); power.emit('pointerup', 13); assert.equal(controls.read().spellPressed, true);
    surface.dataset.interact = 'true'; power.emit('pointerdown', 14); power.emit('pointerup', 14); assert.equal(controls.read().interactPressed, true);
    power.emit('pointerdown', 15); controls.pressTimes.set(15, performance.now() - 460); assert.equal(controls.read().spellPressed, false); assert.equal(palettes, 1); controls.read(); assert.equal(palettes, 1); power.emit('pointerup', 15); assert.equal(controls.read().interactPressed, false);
    power.emit('pointerdown', 16); power.emit('pointercancel', 16); assert.equal(controls.read().spellPressed, false); assert.equal(controls.read().interactPressed, false);
    power.emit('pointerdown', 17); controls.clear(); power.emit('pointerup', 17); assert.equal(controls.read().spellPressed, false); assert.equal(controls.read().interactPressed, false);

  } finally {
    globalThis.window = previousWindow; globalThis.document = previousDocument;
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator); else delete globalThis.navigator;
  }
});
