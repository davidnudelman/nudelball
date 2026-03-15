/**
 * sfx.ts -- Sound effects system using the Web Audio API.
 *
 * All sounds are synthesised from oscillator tones (no external audio files).
 * This keeps the build lightweight and avoids asset-loading latency.
 *
 * The module exports a singleton `SFX` object with methods for each game
 * event sound, plus volume/mute control. Settings (volume, muted) are
 * stored internally and should be kept in sync with the user's Settings
 * object by calling `SFX.setVolume()` and `SFX.toggleMute()` when the
 * user changes preferences.
 *
 * Audio context creation is deferred to the first user gesture (click/tap)
 * because most browsers block autoplay until a user interaction has occurred.
 *
 * Design notes:
 *   - Each sound is defined as a short sequence of frequencies played through
 *     a single GainNode. Frequency 0 means a silent gap (rest).
 *   - The master gain is scaled by `volume * 0.3` to keep sounds subtle.
 *   - OscillatorNode is the only Web Audio source used (no AudioBuffer).
 */

import type { Settings } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Oscillator waveform types available in the Web Audio API. */
type WaveType = OscillatorType; /* 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom' */

// ---------------------------------------------------------------------------
// SFX Singleton
// ---------------------------------------------------------------------------

/**
 * The sound effects engine.
 *
 * Lazily initialises a Web Audio API `AudioContext` on first use, then
 * synthesises short oscillator tones for various in-game events.
 */
const SFX = {
  // -------------------------------------------------------------------------
  // Internal State
  // -------------------------------------------------------------------------

  /** The Web Audio context, created lazily on first user gesture. */
  ctx: null as AudioContext | null,

  /** Current master volume (0.0 to 1.0). */
  _volume: 0.5,

  /** Whether audio is currently muted. */
  _muted: false,

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  /**
   * Lazily create the AudioContext on first call.
   *
   * Browsers require a user gesture (click, tap, keypress) before allowing
   * audio playback. By deferring context creation to the first sound request,
   * we ensure the gesture requirement is satisfied.
   *
   * If the AudioContext is in a "suspended" state (common after tab
   * backgrounding), it is automatically resumed.
   */
  init(): void {
    if (!this.ctx) {
      try {
        /* webkitAudioContext is needed for older Safari versions */
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (e) {
        console.warn('Web Audio not supported:', e);
      }
    }

    /* Resume a suspended context (e.g. after tab was backgrounded) */
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        /* Silently ignore -- some environments don't support resume */
      });
    }
  },

  // -------------------------------------------------------------------------
  // Core Tone Player
  // -------------------------------------------------------------------------

  /**
   * Play a sequence of tones through the Web Audio API.
   *
   * Each entry in `freqs` is a frequency in Hz. A value of 0 produces a
   * silent gap of the same duration (useful for rhythmic patterns).
   *
   * All tones in the sequence are scheduled at precise times relative to
   * `AudioContext.currentTime`, so they play back seamlessly regardless of
   * JavaScript execution timing.
   *
   * @param freqs - Array of frequencies in Hz (0 = silent gap).
   * @param dur   - Duration of each tone/gap in seconds.
   * @param wave  - Oscillator waveform type (default: 'sine').
   */
  playTone(freqs: number[], dur: number, wave?: WaveType): void {
    /* Skip if muted or volume is zero */
    if (this._muted || this._volume <= 0) return;

    this.init();
    if (!this.ctx) return;

    /* Create a single gain node for the entire sequence */
    const gain = this.ctx.createGain();
    gain.gain.value = this._volume * 0.3; /* Keep sounds subtle */
    gain.connect(this.ctx.destination);

    let t = this.ctx.currentTime;

    for (const f of freqs) {
      if (f > 0) {
        const osc = this.ctx.createOscillator();
        osc.type = wave || 'sine';
        osc.frequency.value = f;
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + dur);
      }
      /* Advance time regardless of whether a tone was played */
      t += dur;
    }
  },

  // -------------------------------------------------------------------------
  // Game Event Sounds
  // -------------------------------------------------------------------------

  /**
   * Goal celebration -- a rising major triad (C5 -> E5 -> G5).
   *
   * Three short sine tones that ascend in pitch, evoking the excitement
   * of a goal being scored.
   */
  goal(): void {
    this.playTone([523, 659, 784], 0.12, 'sine');
  },

  /**
   * Referee whistle -- a sustained high-pitched tone.
   *
   * Two identical 880Hz tones played back-to-back create a ~0.5s whistle
   * effect. Used for kick-off, half-time, and full-time.
   */
  whistle(): void {
    this.playTone([880, 880], 0.25, 'sine');
  },

  /**
   * Yellow card warning -- a low buzzy double-beep.
   *
   * Square-wave tones at 220Hz and 200Hz produce a harsh, attention-getting
   * buzz that signals a caution.
   */
  yellowCard(): void {
    this.playTone([220, 200], 0.15, 'square');
  },

  /**
   * Red card -- the same harsh buzz as yellow but with a lower, more
   * ominous tone to distinguish the severity.
   */
  redCard(): void {
    this.playTone([180, 160], 0.18, 'square');
  },

  /**
   * Substitution double-beep -- two short pips with a gap.
   *
   * The pattern (660Hz, silence, 660Hz) mimics the classic electronic
   * board beep heard in real football when a sub is made.
   */
  sub(): void {
    this.playTone([660, 0, 660], 0.1, 'sine');
  },

  /**
   * Crowd cheer -- a layered burst using sawtooth + triangle waves.
   *
   * Creates a richer, warmer sound than a single oscillator. The
   * ascending frequencies give a sense of rising excitement.
   */
  cheer(): void {
    this.playTone([330, 440, 550, 660], 0.08, 'sawtooth');
  },

  /**
   * Generic UI click -- a single very short pip.
   *
   * Used for button presses, navigation, and other UI interactions.
   * Kept extremely brief (50ms) so it doesn't feel intrusive.
   */
  click(): void {
    this.playTone([600], 0.05, 'sine');
  },

  /**
   * Tactic change confirmation -- a two-tone ascending triangle wave.
   *
   * The triangle waveform gives a softer, more musical quality than sine,
   * making it feel like a "settings applied" confirmation.
   */
  tactic(): void {
    this.playTone([440, 554], 0.1, 'triangle');
  },

  // -------------------------------------------------------------------------
  // Volume & Mute Control
  // -------------------------------------------------------------------------

  /**
   * Set the master volume level.
   *
   * Values are clamped to the [0.0, 1.0] range. Setting volume above 0
   * automatically unmutes the audio (consistent with user expectation that
   * moving a volume slider should produce sound).
   *
   * @param vol - Desired volume level (0.0 = silent, 1.0 = max).
   */
  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol));
    /* If the user explicitly sets a non-zero volume, unmute */
    if (this._volume > 0) {
      this._muted = false;
    }
  },

  /**
   * Toggle mute on/off.
   *
   * When toggled on, all sounds are suppressed without changing the volume
   * level. When toggled off, sound resumes at the previous volume.
   *
   * @returns The new muted state (true = muted, false = unmuted).
   */
  toggleMute(): boolean {
    this._muted = !this._muted;
    return this._muted;
  },

  // -------------------------------------------------------------------------
  // Settings Sync
  // -------------------------------------------------------------------------

  /**
   * Synchronise the SFX state with a Settings object.
   *
   * Call this when loading settings from localStorage or when the user
   * changes audio preferences in the settings panel. This avoids tight
   * coupling between the SFX module and the settings persistence layer.
   *
   * @param settings - The user's current Settings object.
   */
  syncFromSettings(settings: Settings): void {
    if (settings.volume != null) {
      this._volume = Math.max(0, Math.min(1, settings.volume));
    }
    if (settings.muted != null) {
      this._muted = settings.muted;
    }
  },

  /**
   * Get the current volume level.
   *
   * @returns The current master volume (0.0 to 1.0).
   */
  getVolume(): number {
    return this._volume;
  },

  /**
   * Check whether audio is currently muted.
   *
   * @returns `true` if muted, `false` otherwise.
   */
  isMuted(): boolean {
    return this._muted;
  },
};

export { SFX };
