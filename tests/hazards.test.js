import test from 'node:test';
import assert from 'node:assert/strict';
import { hazardState } from '../src/combat.js';

test('fire and EMP follow their authored duty cycle; spikes remain active', () => {
  for (const type of ['fire','emp']) {
    const hazard = { type, period: 4, onTime: 1, phase: 0.5 };
    assert.equal(hazardState(hazard, 0), 'active');
    assert.equal(hazardState(hazard, 1), 'off');
    assert.equal(hazardState(hazard, 3.9), 'active');
  }
  assert.equal(hazardState({ type:'spikes' }, 100), 'active');
});
