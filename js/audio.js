/**
 * audio.js — Web Audio synthesizer for GAMOS interaction sounds
 *
 * Spec   : C:\Users\art1\.claude\plans\quizzical-stirring-castle.md (4a)
 * Source : arch-corridor-gallery/src/utils/audio.ts (port, MINUS toggleAmbient)
 *
 * Exports
 * -------
 *   playClick()        — short 1.2kHz → 150Hz sine click (0.13s)
 *   playWhoosh(down)   — 220→80Hz pitch-down (default) OR 110→250Hz pitch-up
 *                        triangle whoosh (0.6s)
 *
 * Lazy AudioContext init on first call (browser autoplay policy compliance).
 * Fails silently — no UI surface for audio errors.
 *
 * Constitution
 *   §10.3 module-scoped state, ESM exports, init/destroy contract.
 */

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    } catch {
      audioCtx = null;
      return null;
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    try { audioCtx.resume(); } catch { /* ignore */ }
  }
  return audioCtx;
}

export function playClick() {
  try {
    const ctx = initAudio();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch {
    /* fail silently */
  }
}

export function playWhoosh(pitchDown = true) {
  try {
    const ctx = initAudio();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "triangle";
    const startFreq = pitchDown ? 220 : 110;
    const endFreq   = pitchDown ?  80 : 250;

    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.6);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* fail silently */
  }
}

// Module shape: no-op init/destroy for main.js registry compatibility.
export function init() {}
export function destroy() {
  if (audioCtx) {
    try { audioCtx.close(); } catch { /* ignore */ }
    audioCtx = null;
  }
}
