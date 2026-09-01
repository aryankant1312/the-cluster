/**
 * THE CONNECTION CHIME — one note per line drawn between two stars.
 *
 * The sound keeps the pattern the original sky was designed around: five
 * pitches stacked in minor thirds — A3, C4, D♯4, F♯4, A4 — a diminished
 * seventh, which is the one chord with no root and no resolution. Every note
 * in it belongs equally, so a constellation can be drawn in any order and
 * never sound wrong, and it never settles, which is the point of a vault you
 * are looking up inside of. The note climbs as a constellation grows and drops
 * back to the bottom of the stack when a new one is started.
 *
 * Synthesised rather than sampled, so the Vault ships no audio files: two
 * detuned oscillators through a lowpass with a long release, then a shared
 * chorus → delay → reverb tail. The reverb's impulse response is generated
 * from decaying noise at construction — a convolution reverb needs an impulse,
 * not a recording, and a synthetic one costs nothing to ship.
 *
 * Everything is built lazily on the first note, because an AudioContext
 * created before a user gesture starts suspended and browsers are right to
 * insist on that.
 */

/** A3, C4, D♯4, F♯4, A4 — a diminished seventh, in Hz. */
const NOTES = [220.0, 261.626, 311.127, 369.994, 440.0];

/** Seconds. Long enough that two quick connections overlap and ring together. */
const RELEASE = 2.6;

export class SkyChime {
  private ctx: AudioContext | null = null;
  private voiceBus: GainNode | null = null;
  private disposed = false;

  /**
   * Bring the graph up. Safe to call repeatedly; only the first call builds.
   * Must happen inside a user gesture or the context stays suspended.
   */
  private ensure(): AudioContext | null {
    if (this.disposed) return null;
    if (this.ctx) {
      // Browsers suspend the context when a tab is backgrounded, so a resume
      // on every note is not redundant.
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    }

    const Ctor =
      typeof window !== "undefined"
        ? (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)
        : undefined;
    if (!Ctor) return null;

    const ctx = new Ctor();
    this.ctx = ctx;

    // Master, kept well under unity so several overlapping tails cannot clip.
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // Reverb: exponentially decaying stereo noise as the impulse. A long,
    // diffuse tail is what makes a single note read as a room rather than a
    // beep.
    const seconds = 3.6;
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4);
      }
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse;
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0.62;
    reverb.connect(reverbWet).connect(master);

    // Feedback delay, slow enough to be heard as an echo of the note rather
    // than as part of it.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.4;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.25;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.22;
    delay.connect(feedback).connect(delay);
    delay.connect(delayWet).connect(master);
    delayWet.connect(reverb);

    // Chorus: one short modulated delay. Detuning the tone against a delayed
    // copy of itself is what stops two identical notes sounding identical.
    const chorus = ctx.createDelay(0.1);
    chorus.delayTime.value = 0.015;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.2;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.006;
    lfo.connect(lfoDepth).connect(chorus.delayTime);
    lfo.start();
    const chorusWet = ctx.createGain();
    chorusWet.gain.value = 0.32;
    chorus.connect(chorusWet).connect(master);
    chorusWet.connect(reverb);

    // Every voice lands here and fans out to dry plus the three sends.
    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(master);
    bus.connect(reverb);
    bus.connect(delay);
    bus.connect(chorus);
    this.voiceBus = bus;

    return ctx;
  }

  /**
   * Sound one connection.
   *
   * `step` is how many lines the constellation being drawn already has, so a
   * growing figure climbs the stack and a fresh one starts at the bottom.
   */
  play(step: number) {
    const ctx = this.ensure();
    const bus = this.voiceBus;
    if (!ctx || !bus) return;

    const now = ctx.currentTime;
    const freq = NOTES[Math.abs(Math.trunc(step)) % NOTES.length];

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(0.34, now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.14, now + 0.4);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + RELEASE);

    // A gentle lowpass that closes as the note decays, so the tail darkens
    // the way a struck object does instead of fading at constant brightness.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(2600, now);
    tone.frequency.exponentialRampToValueAtTime(700, now + RELEASE);
    tone.Q.value = 0.4;

    const fundamental = ctx.createOscillator();
    fundamental.type = "sine";
    fundamental.frequency.value = freq;

    // A quiet detuned triangle an octave up: the beat between the two is the
    // shimmer, and the octave is what keeps the note audible over the reverb.
    const shimmer = ctx.createOscillator();
    shimmer.type = "triangle";
    shimmer.frequency.value = freq * 2;
    shimmer.detune.value = 5;
    const shimmerAmp = ctx.createGain();
    shimmerAmp.gain.value = 0.16;

    fundamental.connect(tone);
    shimmer.connect(shimmerAmp).connect(tone);
    tone.connect(amp).connect(bus);

    fundamental.start(now);
    shimmer.start(now);
    fundamental.stop(now + RELEASE + 0.1);
    shimmer.stop(now + RELEASE + 0.1);

    // Nodes are unreachable once the oscillators end; dropping the graph edge
    // explicitly keeps a long session from accumulating dead branches.
    fundamental.onended = () => {
      amp.disconnect();
      tone.disconnect();
      shimmerAmp.disconnect();
    };
  }

  /** Tear the context down. The component calls this on unmount. */
  dispose() {
    this.disposed = true;
    const ctx = this.ctx;
    this.ctx = null;
    this.voiceBus = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }
}
