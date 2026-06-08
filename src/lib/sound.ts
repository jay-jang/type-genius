// ---------------------------------------------------------------------------
// Synthesized sound engine (Web Audio). Everything is generated at runtime so
// there are no audio asset files to ship or fail to load — the app is fully
// self-contained. Designed for "타격감": a punchy mechanical-keyboard feel.
// ---------------------------------------------------------------------------

import type { KeySoundProfile } from '../types'

interface KeyTone {
  freq: number
  type: OscillatorType
  dur: number
  noise: number // amount of click noise
}

const PROFILES: Record<KeySoundProfile, KeyTone> = {
  thock: { freq: 180, type: 'triangle', dur: 0.09, noise: 0.35 }, // deep mechanical thock
  click: { freq: 900, type: 'square', dur: 0.05, noise: 0.5 }, // crisp blue-switch click
  soft: { freq: 320, type: 'sine', dur: 0.07, noise: 0.12 }, // muted membrane
}

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = true
  private volume = 0.6
  private profile: KeySoundProfile = 'thock'
  private noiseBuffer: AudioBuffer | null = null

  private ensure(): boolean {
    if (this.ctx) return true
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return false
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.volume
    this.master.connect(this.ctx.destination)

    // Pre-allocate 1 second of white noise
    const sampleRate = this.ctx.sampleRate
    const bufferSize = sampleRate * 1.0
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    return true
  }

  /** Must be called from a user gesture (autoplay policy). */
  resume(): void {
    if (!this.ensure()) return
    if (this.ctx!.state === 'suspended') void this.ctx!.resume()
  }

  setEnabled(v: boolean): void {
    this.enabled = v
  }
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.master) this.master.gain.value = this.volume
  }
  setProfile(p: KeySoundProfile): void {
    this.profile = p
  }

  private get t(): number {
    return this.ctx!.currentTime
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0): void {
    const start = this.t + when
    const osc = this.ctx!.createOscillator()
    const g = this.ctx!.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    // tiny downward pitch drop gives a percussive feel
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.7), start + dur)
    g.gain.setValueAtTime(0.0001, start)
    g.gain.linearRampToValueAtTime(vol, start + 0.003)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(g)
    g.connect(this.master!)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  }

  private clickNoise(amount: number, dur: number): void {
    if (amount <= 0 || !this.noiseBuffer) return
    const start = this.t
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noiseBuffer

    // Play a random slice of the pre-allocated noise buffer
    const bufferDuration = this.noiseBuffer.duration
    const playOffset = Math.random() * (bufferDuration - dur - 0.05)

    const filt = this.ctx!.createBiquadFilter()
    filt.type = 'highpass'
    filt.frequency.value = 1800

    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(amount, start)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)

    src.connect(filt)
    filt.connect(g)
    g.connect(this.master!)
    src.start(start, playOffset, dur)
  }

  /** A correct keystroke. */
  key(): void {
    if (!this.enabled || !this.ensure()) return
    this.resume()
    const p = PROFILES[this.profile]
    const jitter = 1 + (Math.random() - 0.5) * 0.06
    this.tone(p.freq * jitter, p.dur, p.type, 0.5)
    this.clickNoise(p.noise * 0.4, 0.02)
  }

  /** A wrong keystroke — a short dissonant thud. */
  error(): void {
    if (!this.enabled || !this.ensure()) return
    this.resume()
    this.tone(110, 0.16, 'sawtooth', 0.35)
    this.tone(78, 0.2, 'sawtooth', 0.25, 0.01)
  }

  /** Combo milestone reached (level scales pitch upward). */
  combo(level: number): void {
    if (!this.enabled || !this.ensure()) return
    this.resume()
    const base = 520 + level * 70
    this.tone(base, 0.1, 'triangle', 0.3)
    this.tone(base * 1.5, 0.12, 'triangle', 0.22, 0.05)
  }

  /** Passage finished — a little ascending fanfare. */
  complete(): void {
    if (!this.enabled || !this.ensure()) return
    this.resume()
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((n, i) => this.tone(n, 0.28, 'triangle', 0.3, i * 0.085))
  }

  /** A soft UI tick for selections. */
  ui(): void {
    if (!this.enabled || !this.ensure()) return
    this.resume()
    this.tone(660, 0.05, 'sine', 0.18)
  }
}

export const sound = new SoundEngine()
