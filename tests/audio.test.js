import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/audio.js';

test('music and combat effects keep independent levels across audio startup', async () => {
  const originalWindow = globalThis.window;
  class Context {
    sampleRate = 4;
    state = 'running';
    destination = {};
    createGain() { return { gain: { value: 0 }, connect(target) { this.target = target; } }; }
    createBuffer() { return { getChannelData: () => new Float32Array(4) }; }
  }
  try {
    globalThis.window = { AudioContext: Context };
    const sound = new Sound();
    sound.setMusicVolume(.3); sound.setSfxVolume(.9);
    await sound.start();
    assert.equal(sound.musicGain.gain.value, .3);
    assert.equal(sound.sfxGain.gain.value, .9);
    assert.equal(sound.musicGain.target, sound.master);
    assert.equal(sound.sfxGain.target, sound.master);
    sound.setMuted(true); assert.equal(sound.master.gain.value, 0);
    sound.setMusicVolume(0); sound.setSfxVolume(1);
    assert.equal(sound.musicGain.gain.value, 0);
    assert.equal(sound.sfxGain.gain.value, 1);
  } finally { globalThis.window = originalWindow; }
});

test('the music sequencer routes its notes to the music channel', () => {
  const sound = new Sound(), channels = [];
  sound.ctx = { currentTime: 0 };
  sound.tone = (...args) => channels.push(args.at(-1));
  sound.update(true, false);
  assert.ok(channels.length > 0);
  assert.ok(channels.every(channel => channel === 'music'));
});
