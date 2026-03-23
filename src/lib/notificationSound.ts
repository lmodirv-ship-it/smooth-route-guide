/**
 * Notification Sound Service
 * Generates an alert tone using Web Audio API — works on Web, APK & AAB.
 * No external audio files needed.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Resume audio context after user interaction (required by browsers & mobile).
 * Call this once on any user tap/click.
 */
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  } catch {
    // ignore
  }
}

/**
 * Play a short notification chime (two rising tones).
 * Safe to call repeatedly — overlapping calls won't crash.
 */
export function playNewOrderSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587, now);         // D5
    osc1.frequency.setValueAtTime(659, now + 0.12);  // E5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2 (higher, slight delay)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(784, now + 0.15);  // G5
    osc2.frequency.setValueAtTime(880, now + 0.27);  // A5
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.4);

    // Tone 3 (completion chime)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1047, now + 0.35); // C6
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.setValueAtTime(0.25, now + 0.35);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc3.connect(gain3).connect(ctx.destination);
    osc3.start(now + 0.35);
    osc3.stop(now + 0.6);
  } catch (err) {
    console.warn("[Sound] Failed to play notification:", err);
  }
}

/**
 * Play a vibration pattern if supported (mobile).
 */
export function vibrateNewOrder() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  } catch {
    // ignore
  }
}

/**
 * Combined: play sound + vibrate.
 */
export function notifyNewOrder() {
  playNewOrderSound();
  vibrateNewOrder();
}
