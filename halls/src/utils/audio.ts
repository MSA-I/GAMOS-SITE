// Safe Web Audio API Synthesizer for ambient sounds and clicks

let audioCtx: AudioContext | null = null;
let ambientOsc1: OscillatorNode | null = null;
let ambientOsc2: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

export const playClick = () => {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.13);
  } catch (e) {
    // Fail silently to prevent any runtime issues
  }
};

export const playWhoosh = (pitchDown = true) => {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = "triangle";
    const startFreq = pitchDown ? 220 : 110;
    const endFreq = pitchDown ? 80 : 250;

    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.6);

    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch (e) {
    // Fail silently
  }
};

export const toggleAmbient = (enable: boolean) => {
  try {
    initAudio();
    if (!audioCtx) return;

    if (!enable) {
      if (ambientGain) {
        ambientGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
        setTimeout(() => {
          try {
            ambientOsc1?.stop();
            ambientOsc2?.stop();
            ambientOsc1 = null;
            ambientOsc2 = null;
            ambientGain = null;
          } catch (err) {}
        }, 1100);
      }
      return;
    }

    // Stop existing first
    if (ambientOsc1) {
      return;
    }

    ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 2.0); // very soft/relaxing

    // Low chord (E2 and B2 frequencies)
    ambientOsc1 = audioCtx.createOscillator();
    ambientOsc1.type = "sine";
    ambientOsc1.frequency.setValueAtTime(82.41, audioCtx.currentTime); // E2

    ambientOsc2 = audioCtx.createOscillator();
    ambientOsc2.type = "sine";
    ambientOsc2.frequency.setValueAtTime(123.47, audioCtx.currentTime); // B2

    // Connect custom lowpass to make it warm
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, audioCtx.currentTime);

    ambientOsc1.connect(filter);
    ambientOsc2.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);

    ambientOsc1.start();
    ambientOsc2.start();
  } catch (e) {
    // Fail silently
  }
};
