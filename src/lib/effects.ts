// Lightweight DOM particle effects driven by the Web Animations API. No canvas,
// no deps — particles are short-lived absolutely-positioned nodes that remove
// themselves when their animation finishes. Coordinates are relative to `layer`.

const FALLBACK = ['#e2b714', '#d1d0c5', '#ca4754']

/** Read the live theme palette so effects match the current Monkeytype theme. */
function themeColors(): string[] {
  if (typeof document === 'undefined') return FALLBACK
  const s = getComputedStyle(document.documentElement)
  const cols = ['--main', '--text', '--error']
    .map((v) => s.getPropertyValue(v).trim())
    .filter(Boolean)
  return cols.length ? cols : FALLBACK
}

interface BurstOpts {
  count?: number
  colors?: string[]
  power?: number
  size?: number
  up?: boolean
}

export function spawnBurst(layer: HTMLElement, x: number, y: number, opts: BurstOpts = {}): void {
  const { count = 5, colors = themeColors(), power = 55, size = 6, up = true } = opts
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.className = 'fx-particle'
    const s = size * (0.6 + Math.random() * 0.9)
    el.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${
      colors[(Math.random() * colors.length) | 0]
    };`
    layer.appendChild(el)
    const ang = Math.random() * Math.PI * 2
    const dist = power * (0.4 + Math.random())
    const dx = Math.cos(ang) * dist
    const dy = Math.sin(ang) * dist - (up ? 18 : 0)
    el.animate(
      [
        { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(0)`, opacity: 0 },
      ],
      { duration: 380 + Math.random() * 320, easing: 'cubic-bezier(.2,.8,.3,1)' },
    ).onfinish = () => el.remove()
  }
}

export function spawnConfetti(layer: HTMLElement, pieces = 90): void {
  const rect = layer.getBoundingClientRect()
  const w = rect.width || 600
  const h = rect.height || 400
  const colors = themeColors()
  for (let i = 0; i < pieces; i++) {
    const el = document.createElement('div')
    el.className = 'fx-confetti'
    const sz = 6 + Math.random() * 8
    el.style.cssText = `left:${Math.random() * w}px;top:-20px;width:${sz}px;height:${
      sz * 0.5
    }px;background:${colors[(Math.random() * colors.length) | 0]};`
    layer.appendChild(el)
    const drift = (Math.random() - 0.5) * 200
    const rot = (Math.random() - 0.5) * 1080
    el.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${drift}px,${h + 60}px) rotate(${rot}deg)`, opacity: 0.9 },
      ],
      { duration: 1400 + Math.random() * 1200, easing: 'cubic-bezier(.3,.7,.5,1)', delay: Math.random() * 250 },
    ).onfinish = () => el.remove()
  }
}

export function shake(el: HTMLElement, intensity = 6): void {
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: `translateX(-${intensity}px)` },
      { transform: `translateX(${intensity}px)` },
      { transform: `translateX(-${intensity * 0.5}px)` },
      { transform: 'translateX(0)' },
    ],
    { duration: 170, easing: 'ease-in-out' },
  )
}

export function flash(el: HTMLElement, color: string): void {
  el.animate(
    [
      { boxShadow: `0 0 0 0 ${color}00`, borderColor: color },
      { boxShadow: `0 0 0 4px ${color}55`, borderColor: color },
      { boxShadow: `0 0 0 0 ${color}00` },
    ],
    { duration: 240, easing: 'ease-out' },
  )
}
