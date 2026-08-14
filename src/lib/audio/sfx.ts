'use client';

// UI feedback tones (click/chime/win) are synthesized via the Web Audio API
// since they're purely functional cues. Game-world sounds (cards, chips) use
// real clips from Kenney's CC0 "Casino Audio" pack (public/sfx/, see
// LICENSE.txt there) — decoded once into AudioBuffers and played through
// fresh BufferSourceNodes each time, so the same clip can overlap itself
// (e.g. multiple chip sounds in quick succession) without cutting off.

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, startOffset: number, duration: number, gain = 0.12, type: OscillatorType = 'sine') {
  const audioCtx = getContext();
  const start = audioCtx.currentTime + startOffset;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(gain, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Any button press — Fold/Check/Call/Raise, preset picks, Confirm. */
export function playClick(): void {
  tone(440, 0, 0.05, 0.07, 'square');
}

/** It just became the human's turn to act. */
export function playTurnChime(): void {
  tone(660, 0, 0.12, 0.1, 'sine');
  tone(880, 0.1, 0.16, 0.09, 'sine');
}

/** A hand resolved and a pot was awarded. */
export function playHandWin(): void {
  [523.25, 659.25, 783.99].forEach((freq, i) => tone(freq, i * 0.09, 0.18, 0.11, 'triangle'));
}

/** The tournament itself was won. */
export function playTournamentWin(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, i * 0.12, 0.35, 0.13, 'triangle'));
}

const bufferCache = new Map<string, Promise<AudioBuffer>>();

function loadBuffer(url: string): Promise<AudioBuffer> {
  let cached = bufferCache.get(url);
  if (!cached) {
    cached = fetch(url)
      .then((res) => res.arrayBuffer())
      .then((data) => getContext().decodeAudioData(data));
    bufferCache.set(url, cached);
  }
  return cached;
}

function playClip(url: string, gain = 0.4): void {
  loadBuffer(url)
    .then((buffer) => {
      const audioCtx = getContext();
      const source = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = gain;
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      source.start();
    })
    .catch(() => {
      // Missing/corrupt asset shouldn't break gameplay — silently skip.
    });
}

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const CARD_PLACE_URLS = [1, 2, 3, 4].map((i) => `/sfx/card-place-${i}.ogg`);
const CHIP_STACK_URLS = [1, 2, 3, 4, 5, 6].map((i) => `/sfx/chips-stack-${i}.ogg`);
const CHIP_COLLIDE_URLS = [1, 2, 3, 4].map((i) => `/sfx/chips-collide-${i}.ogg`);

/** A new hand is being dealt. */
export function playCardShuffle(): void {
  playClip('/sfx/card-shuffle.ogg', 0.35);
}

/** Community cards revealed (flop/turn/river). */
export function playCardPlace(): void {
  playClip(randomOf(CARD_PLACE_URLS), 0.4);
}

/** A player bet, called, raised, or went all-in. */
export function playChipStack(): void {
  playClip(randomOf(CHIP_STACK_URLS), 0.3);
}

/** The pot lands at the winner's seat. */
export function playChipCollide(): void {
  playClip(randomOf(CHIP_COLLIDE_URLS), 0.35);
}

// Spoken lines from Kenney's CC0 "Voiceover Pack #1" (public/voice/, see
// LICENSE.txt there) — the pack is generic arcade/action phrases, so only
// the handful that read naturally over a poker hand are used here.

/** A new hand is being dealt (layers with playCardShuffle). */
export function playVoiceReady(): void {
  playClip('/voice/ready.ogg', 0.5);
}

/** The human won a hand or the tournament. */
export function playVoiceWin(): void {
  playClip('/voice/congratulations.ogg', 0.5);
}

/** The human busted out of the tournament. */
export function playVoiceGameOver(): void {
  playClip('/voice/game_over.ogg', 0.5);
}
