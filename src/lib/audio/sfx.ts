'use client';

// Synthesized sound effects via the Web Audio API — no audio asset files
// exist in this project, so these are simple oscillator tones rather than
// recorded clips. Card-deal/chip-clink/ambient sound needs real audio
// files supplied separately; swap those in as `<audio>`-based playback
// once available rather than trying to synthesize them here.

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
