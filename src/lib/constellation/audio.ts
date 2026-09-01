/**
 * THE SKY SYNTH — an ambient pad underneath, a chime on every line drawn.
 *
 * Nothing here is sampled, so the Vault ships no audio files. The pad is four
 * detuned sine oscillators through a lowpass whose cutoff is walked by a very
 * slow LFO; the chime is a sine with an exponential gain decay. Both land on a
 * shared reverb, delay and chorus bus, which is what makes a single sine read
 * as a room rather than a beep.
 *
 * PITCHES ARE PENTATONIC — C4, D4, E4, G4, A4, C5, D5. A major pentatonic
 * scale has no semitone anywhere in it, so no two notes in the set can clash.
 * A visitor clicking stars in whatever order they like is composing, and this
 * is the tuning that makes every order sound deliberate.
 *
 * The context is built lazily on the first sound. An AudioContext created
 * before a user gesture starts suspended and browsers are right to insist on
 * that, so the pad cannot simply begin on mount — `start()` is called from the
 * first interaction inside the sky.
 */

/** C4, D4, E4, G4, A4, C5, D5 — major pentatonic, in Hz. */
const NOTES = [261.626, 293.665, 329.628, 391.995, 440.0, 523.251, 587.33];

/** Seconds. Long enough that two quick connections overlap and ring together. */
const RELEASE = 2.6;

/** Root and fifth of the pad, two octaves below the chimes. */
const PAD_ROOT = 65.406;
const PAD_FIFTH = 97.999;

export class SkySynth {
  private ctx: AudioContext | null = null;
  private voiceBus: GainNode | null = null;
  private master: GainNode | null = null;
  private padGain: GainNode | null = null;
  private padNodes: OscillatorNode[] = [];
  private muted = false;
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

    // Master, kept well under unity so several overlapping tails plus the pad
    // cannot clip.
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.5;
    master.connect(ctx.destination);
    this.master = master;

    // Reverb: exponentially decaying stereo noise as the impulse. A long,
    // diffuse tail is what makes one note read as a room. A convolver needs an
    // impulse, not a recording, and a synthetic one costs nothing to ship.
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
    const chorusLfo = ctx.createOscillator();
    chorusLfo.frequency.value = 0.2;
    const chorusDepth = ctx.createGain();
    chorusDepth.gain.value = 0.006;
    chorusLfo.connect(chorusDepth).connect(chorus.delayTime);
    chorusLfo.start();
    const chorusWet = ctx.createGain();
    chorusWet.gain.value = 0.32;
    chorus.connect(chorusWet).connect(master);
    chorusWet.connect(reverb);

    // Every chime lands here and fans out to dry plus the three sends.
    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(master);
    bus.connect(reverb);
    bus.connect(delay);
    bus.connect(chorus);
    this.voiceBus = bus;

    this.buildPad(ctx, reverb, master);

    return ctx;
  }

  /**
   * The bed: a root and a fifth, each detuned against itself, through a
   * lowpass that a 0.05 Hz LFO opens and closes over twenty seconds.
   *
   * The detune is what stops it sounding like a test tone — two oscillators a
   * few cents apart beat against each other at well under a hertz, which the
   * ear hears as the sound breathing. The filter sweep is slow enough that
   * nobody notices it moving, only that the room is not static.
   */
  private buildPad(ctx: AudioContext, reverb: ConvolverNode, master: GainNode) {
    const padGain = ctx.createGain();
    // Raised by `start()`, so building the graph is silent.
    padGain.gain.value = 0;
    this.padGain = padGain;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    filter.Q.value = 3.2;

    const sweep = ctx.createOscillator();
    sweep.type = "sine";
    // One full cycle every twenty seconds.
    sweep.frequency.value = 0.05;
    const sweepDepth = ctx.createGain();
    sweepDepth.gain.value = 190;
    sweep.connect(sweepDepth).connect(filter.frequency);
    sweep.start();

    const voices: Array<[number, number]> = [
      [PAD_ROOT, -6],
      [PAD_ROOT, 6],
      [PAD_FIFTH, -4],
      [PAD_FIFTH, 4],
    ];
    for (const [freq, detune] of voices) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start();
      this.padNodes.push(osc);
    }
    this.padNodes.push(sweep);

    filter.connect(padGain);
    padGain.connect(master);
    padGain.connect(reverb);
  }

  /**
   * Start the pad. Call from a user gesture — the first interaction inside the
   * sky. Idempotent, so every click can call it without checking first.
   */
  start() {
    const ctx = this.ensure();
    if (!ctx || !this.padGain) return;
    const target = this.muted ? 0 : 0.09;
    if (Math.abs(this.padGain.gain.value - target) < 0.001) return;
    // Faded in over four seconds. A pad that arrives instantly is an event;
    // one that arrives slowly is a room the visitor was already standing in.
    this.padGain.gain.cancelScheduledValues(ctx.currentTime);
    this.padGain.gain.setValueAtTime(this.padGain.gain.value, ctx.currentTime);
    this.padGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 4);
  }

  /** Mute or unmute everything, pad included. */
  setMuted(muted: boolean) {
    this.muted = muted;
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.5, now + 0.25);
  }

  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Sound one connection.
   *
   * `step` is how many lines the figure being drawn already has, so a growing
   * constellation climbs the scale and a fresh one starts at the bottom. The
   * modulo wraps a long chain rather than running it off the top of hearing.
   */
  play(step: number) {
    const ctx = this.ensure();
    const bus = this.voiceBus;
    if (!ctx || !bus || this.muted) return;

    const now = ctx.currentTime;
    const freq = NOTES[Math.abs(Math.trunc(step)) % NOTES.length];

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(0.34, now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.14, now + 0.4);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + RELEASE);

    // A lowpass that closes as the note decays, so the tail darkens the way a
    // struck object does instead of fading at constant brightness.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(2600, now);
    tone.frequency.exponentialRampToValueAtTime(700, now + RELEASE);
    tone.Q.value = 0.4;

    const fundamental = ctx.createOscillator();
    fundamental.type = "sine";
    fundamental.frequency.value = freq;

    // A quiet detuned triangle an octave up: the beat between the two is the
    // shimmer, and the octave keeps the note audible over the reverb.
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
    for (const osc of this.padNodes) {
      try {
        osc.stop();
      } catch {
        // Already stopped, or the context went first. Either way there is
        // nothing to clean up and nothing worth reporting.
      }
    }
    this.padNodes = [];
    const ctx = this.ctx;
    this.ctx = null;
    this.voiceBus = null;
    this.master = null;
    this.padGain = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }
}
