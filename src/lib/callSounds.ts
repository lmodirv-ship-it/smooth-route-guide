/**
 * Call Sound Service — ringtone, dial tone, end tone
 * Uses Web Audio API, no external files needed.
 */

let audioCtx: AudioContext | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let ringtoneOscillators: OscillatorNode[] = [];

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/** Play a single ring burst (2 tones) */
function playRingBurst() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Classic phone ring: two frequencies
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.value = 440; // A4
    osc2.type = "sine";
    osc2.frequency.value = 480; // slightly higher

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.setValueAtTime(0.25, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);

    ringtoneOscillators.push(osc1, osc2);

    // Second burst after pause
    const osc3 = ctx.createOscillator();
    const osc4 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc3.type = "sine";
    osc3.frequency.value = 440;
    osc4.type = "sine";
    osc4.frequency.value = 480;

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.25, now + 0.7);
    gain2.gain.setValueAtTime(0.25, now + 1.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc3.connect(gain2);
    osc4.connect(gain2);
    gain2.connect(ctx.destination);

    osc3.start(now + 0.7);
    osc4.start(now + 0.7);
    osc3.stop(now + 1.2);
    osc4.stop(now + 1.2);

    ringtoneOscillators.push(osc3, osc4);
  } catch { /* ignore */ }
}

/** Start repeating ringtone (for incoming calls) */
export function startRingtone() {
  stopRingtone();
  playRingBurst();
  ringtoneInterval = setInterval(playRingBurst, 3000);
  // Vibrate pattern
  try { navigator.vibrate?.([300, 200, 300, 200, 300]); } catch { /* */ }
}

/** Stop the ringtone */
export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  ringtoneOscillators.forEach(o => { try { o.stop(); } catch { /* */ } });
  ringtoneOscillators = [];
  try { navigator.vibrate?.(0); } catch { /* */ }
}

/** Play outgoing dial tone (single beep every 3s) */
let dialInterval: ReturnType<typeof setInterval> | null = null;

function playDialBeep() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 425;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1);
  } catch { /* */ }
}

export function startDialTone() {
  stopDialTone();
  playDialBeep();
  dialInterval = setInterval(playDialBeep, 3500);
}

export function stopDialTone() {
  if (dialInterval) {
    clearInterval(dialInterval);
    dialInterval = null;
  }
}

/** Play call-ended tone */
export function playEndTone() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.setValueAtTime(480, now + 0.15);
    osc.frequency.setValueAtTime(380, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch { /* */ }
}
