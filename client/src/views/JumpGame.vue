<template>
  <div class="jump-page">
    <section class="game-shell">
      <canvas
        ref="canvasRef"
        class="game-canvas"
        aria-label="跳一跳游戏区域"
        @pointerdown="startCharge"
        @pointerup="releaseCharge"
        @pointercancel="cancelCharge"
        @pointerleave="handlePointerLeave"
      />

      <div class="hud">
        <div>
          <p class="hud-label">SCORE</p>
          <p class="score">{{ score }}</p>
        </div>
        <div>
          <p class="hud-label">BEST</p>
          <p class="best">{{ bestScore }}</p>
        </div>
      </div>

      <button
        class="sound-button"
        type="button"
        :aria-label="muted ? '开启音效' : '关闭音效'"
        @click="muted = !muted"
      >
        <svg v-if="!muted" viewBox="0 0 24 24">
          <path d="M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" />
        </svg>
        <svg v-else viewBox="0 0 24 24"><path d="m11 5-5 4H3v6h3l5 4V5Zm4 5 5 5m0-5-5 5" /></svg>
      </button>

      <div v-if="state === 'ready'" class="center-card intro-card">
        <span class="eyebrow">BANGMIO ARCADE</span>
        <h1>跳一跳</h1>
        <p>按住蓄力，松开起跳</p>
        <button type="button" @click="beginGame">开始游戏</button>
        <small>也可以使用空格键操作</small>
      </div>

      <div v-if="state === 'over'" class="center-card result-card">
        <span class="eyebrow">本局得分</span>
        <strong>{{ score }}</strong>
        <p>{{ resultMessage }}</p>
        <button type="button" @click="resetGame">再来一次</button>
      </div>

      <div v-if="state === 'playing' && !hasJumped" class="tip">按住屏幕蓄力 · 松开起跳</div>
      <div v-if="state === 'playing'" class="power-wrap" :class="{ visible: charging }">
        <div class="power-track">
          <div class="power-fill" :style="{ transform: `scaleX(${charge})` }" />
        </div>
        <span>POWER</span>
      </div>
    </section>

    <div class="game-notes">
      <span><i class="dot dot-green" /> 连续跳跃</span>
      <span><i class="dot dot-yellow" /> 中心落点 +2</span>
      <span><i class="dot dot-purple" /> 越远越刺激</span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref(null)
const score = ref(0)
const bestScore = ref(Number(localStorage.getItem('bangmio-jump-best') || 0))
const state = ref('ready')
const charging = ref(false)
const charge = ref(0)
const muted = ref(false)
const hasJumped = ref(false)

let canvas
let context
let animationFrame
let previousTime = 0
let chargeStartedAt = 0
let audioContext
let resizeObserver

const world = {
  width: 900,
  height: 620,
  cameraX: 0,
  cameraTargetX: 0,
  platforms: [],
  currentPlatform: 0,
  player: { x: 0, y: 0, width: 30, height: 44, velocityX: 0, velocityY: 0, grounded: true },
  particles: [],
  clouds: []
}

const resultMessage = computed(() => {
  if (score.value >= bestScore.value && score.value > 0) return '新纪录！手感相当不错'
  if (score.value >= 20) return '节奏很好，再冲一次吧'
  if (score.value >= 8) return '渐入佳境，继续挑战'
  return '差一点，再试一次'
})

function createPlatform(x, width, colorIndex = 0) {
  const colors = [
    ['#7c6cf2', '#5b4cc4'],
    ['#39c6a2', '#21967a'],
    ['#f3a55b', '#d87834'],
    ['#ec6e91', '#c84b70'],
    ['#5aa8ef', '#337fc4']
  ]
  return { x, y: 455, width, height: 28, depth: 20, colors: colors[colorIndex % colors.length] }
}

function setupWorld() {
  world.platforms = [createPlatform(120, 150, 1), createPlatform(360, 110, 0)]
  world.currentPlatform = 0
  world.cameraX = 0
  world.cameraTargetX = 0
  world.particles = []
  world.clouds = Array.from({ length: 7 }, (_, index) => ({
    x: 80 + index * 180 + Math.random() * 80,
    y: 70 + Math.random() * 180,
    size: 18 + Math.random() * 24,
    speed: 3 + Math.random() * 5
  }))
  const first = world.platforms[0]
  Object.assign(world.player, {
    x: first.x + first.width / 2,
    y: first.y - world.player.height,
    velocityX: 0,
    velocityY: 0,
    grounded: true
  })
  ensurePlatforms()
}

function ensurePlatforms() {
  while (world.platforms.length < world.currentPlatform + 6) {
    const previous = world.platforms.at(-1)
    const difficulty = Math.min(score.value * 2.2, 70)
    const gap = 78 + Math.random() * (105 + difficulty)
    const width = Math.max(66, 125 - difficulty * 0.45 + Math.random() * 34)
    world.platforms.push(
      createPlatform(previous.x + previous.width + gap, width, world.platforms.length)
    )
  }
}

function beginGame() {
  score.value = 0
  hasJumped.value = false
  state.value = 'playing'
  setupWorld()
}

function resetGame() {
  beginGame()
}

function startCharge(event) {
  if (event?.button !== undefined && event.button !== 0) return
  if (state.value === 'ready') {
    beginGame()
    return
  }
  if (state.value === 'over' || !world.player.grounded || charging.value) return
  event?.currentTarget?.setPointerCapture?.(event.pointerId)
  charging.value = true
  chargeStartedAt = performance.now()
  playTone(160, 0.04, 0.025)
}

function releaseCharge(event) {
  if (!charging.value || state.value !== 'playing') return
  event?.currentTarget?.releasePointerCapture?.(event.pointerId)
  launchPlayer()
}

function cancelCharge() {
  charging.value = false
  charge.value = 0
}
function handlePointerLeave(event) {
  if (event.buttons === 0) cancelCharge()
}

function launchPlayer() {
  if (!charging.value || !world.player.grounded) return
  const power = Math.max(0.08, charge.value)
  charging.value = false
  hasJumped.value = true
  Object.assign(world.player, {
    grounded: false,
    velocityX: 210 + power * 330,
    velocityY: -(420 + power * 210)
  })
  charge.value = 0
  playTone(260 + power * 180, 0.08, 0.05)
}

function onKeyDown(event) {
  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault()
    startCharge()
  }
}
function onKeyUp(event) {
  if (event.code === 'Space') {
    event.preventDefault()
    releaseCharge()
  }
}

function update(delta, time) {
  if (charging.value) {
    const elapsed = (time - chargeStartedAt) / 1000
    charge.value = (Math.sin(elapsed * 2.45 - Math.PI / 2) + 1) / 2
  }
  for (const cloud of world.clouds) {
    cloud.x += cloud.speed * delta
    if (cloud.x - world.cameraX > world.width + 120) cloud.x = world.cameraX - 120
  }
  const player = world.player
  if (state.value === 'playing' && !player.grounded) {
    const previousBottom = player.y + player.height
    player.velocityY += 1050 * delta
    player.x += player.velocityX * delta
    player.y += player.velocityY * delta
    const nextBottom = player.y + player.height
    if (player.velocityY > 0) {
      const landingIndex = world.platforms.findIndex(
        (platform, index) =>
          index > world.currentPlatform &&
          player.x > platform.x + 4 &&
          player.x < platform.x + platform.width - 4 &&
          previousBottom <= platform.y &&
          nextBottom >= platform.y
      )
      if (landingIndex >= 0) landOnPlatform(landingIndex)
    }
    if (player.y > world.height + 90) endGame()
  }
  world.cameraX += (world.cameraTargetX - world.cameraX) * Math.min(1, delta * 4.5)
  world.particles = world.particles.filter(particle => {
    particle.life -= delta
    particle.x += particle.velocityX * delta
    particle.y += particle.velocityY * delta
    particle.velocityY += 420 * delta
    return particle.life > 0
  })
}

function landOnPlatform(index) {
  const platform = world.platforms[index]
  Object.assign(world.player, {
    y: platform.y - world.player.height,
    velocityX: 0,
    velocityY: 0,
    grounded: true
  })
  world.currentPlatform = index
  const perfect =
    Math.abs(world.player.x - (platform.x + platform.width / 2)) <
    Math.min(14, platform.width * 0.14)
  score.value += perfect ? 2 : 1
  if (score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('bangmio-jump-best', String(bestScore.value))
  }
  spawnParticles(
    world.player.x,
    platform.y,
    perfect ? '#ffe889' : platform.colors[0],
    perfect ? 18 : 10
  )
  playTone(perfect ? 720 : 480, perfect ? 0.16 : 0.09, perfect ? 0.07 : 0.045)
  world.cameraTargetX = Math.max(0, platform.x - world.width * 0.32)
  ensurePlatforms()
}

function spawnParticles(x, y, color, count) {
  for (let index = 0; index < count; index += 1)
    world.particles.push({
      x,
      y,
      color,
      size: 3 + Math.random() * 5,
      velocityX: (Math.random() - 0.5) * 190,
      velocityY: -70 - Math.random() * 150,
      life: 0.45 + Math.random() * 0.4
    })
}

function endGame() {
  if (state.value !== 'playing') return
  state.value = 'over'
  cancelCharge()
  playTone(120, 0.28, 0.06)
}

function playTone(frequency, duration, volume) {
  if (muted.value) return
  try {
    if (!audioContext) audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
    gain.gain.setValueAtTime(volume, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + duration)
  } catch {
    muted.value = true
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2))
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, 0, world.height)
  gradient.addColorStop(0, '#161a38')
  gradient.addColorStop(0.55, '#252653')
  gradient.addColorStop(1, '#3d3160')
  context.fillStyle = gradient
  context.fillRect(0, 0, world.width, world.height)
  const glow = context.createRadialGradient(
    world.width * 0.78,
    100,
    5,
    world.width * 0.78,
    100,
    180
  )
  glow.addColorStop(0, 'rgba(255,239,181,.23)')
  glow.addColorStop(1, 'rgba(255,239,181,0)')
  context.fillStyle = glow
  context.fillRect(0, 0, world.width, 360)
  for (const cloud of world.clouds) {
    const x = cloud.x - world.cameraX * 0.28
    context.fillStyle = 'rgba(255,255,255,.055)'
    context.beginPath()
    context.arc(x, cloud.y, cloud.size, 0, Math.PI * 2)
    context.arc(x + cloud.size, cloud.y + 5, cloud.size * 0.75, 0, Math.PI * 2)
    context.arc(x - cloud.size, cloud.y + 8, cloud.size * 0.58, 0, Math.PI * 2)
    context.fill()
  }
  context.fillStyle = 'rgba(19,15,42,.34)'
  context.beginPath()
  context.moveTo(0, 470)
  for (let x = 0; x <= world.width; x += 55)
    context.lineTo(x, 452 + Math.sin((x + world.cameraX * 0.12) / 90) * 25)
  context.lineTo(world.width, world.height)
  context.lineTo(0, world.height)
  context.fill()
}

function drawPlatform(platform, index) {
  const x = platform.x - world.cameraX
  if (x + platform.width < -80 || x > world.width + 80) return
  context.fillStyle = 'rgba(5,5,20,.3)'
  context.beginPath()
  context.ellipse(
    x + platform.width / 2,
    platform.y + 53,
    platform.width * 0.55,
    13,
    0,
    0,
    Math.PI * 2
  )
  context.fill()
  const side = context.createLinearGradient(
    0,
    platform.y,
    0,
    platform.y + platform.height + platform.depth
  )
  side.addColorStop(0, platform.colors[1])
  side.addColorStop(1, '#292347')
  context.fillStyle = side
  roundedRect(context, x, platform.y + 9, platform.width, platform.height + platform.depth, 12)
  context.fill()
  const top = context.createLinearGradient(x, platform.y, x + platform.width, platform.y)
  top.addColorStop(0, platform.colors[0])
  top.addColorStop(1, index === world.currentPlatform ? '#b8a9ff' : platform.colors[0])
  context.fillStyle = top
  roundedRect(context, x, platform.y, platform.width, platform.height, 12)
  context.fill()
  context.fillStyle = 'rgba(255,255,255,.18)'
  roundedRect(context, x + 7, platform.y + 5, platform.width - 14, 5, 3)
  context.fill()
}

function drawPlayer() {
  const player = world.player
  const x = player.x - world.cameraX
  const squash = charging.value ? 1 - charge.value * 0.24 : 1
  const stretch = charging.value ? 1 + charge.value * 0.22 : 1
  const bodyHeight = player.height * squash
  const bodyWidth = player.width * stretch
  context.save()
  context.translate(x, player.y + player.height - bodyHeight)
  if (!player.grounded) context.rotate(Math.min(0.28, player.velocityX / 1600))
  const body = context.createLinearGradient(-bodyWidth / 2, 0, bodyWidth / 2, bodyHeight)
  body.addColorStop(0, '#fff7fb')
  body.addColorStop(1, '#e3d5ff')
  context.fillStyle = body
  context.shadowColor = 'rgba(190,161,255,.6)'
  context.shadowBlur = 18
  roundedRect(context, -bodyWidth / 2, 0, bodyWidth, bodyHeight, 12)
  context.fill()
  context.shadowBlur = 0
  context.fillStyle = '#302550'
  context.beginPath()
  context.arc(-5, 16, 2.2, 0, Math.PI * 2)
  context.arc(5, 16, 2.2, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#8a68c7'
  context.lineWidth = 1.8
  context.beginPath()
  context.arc(0, 19, 5, 0.15, Math.PI - 0.15)
  context.stroke()
  context.restore()
}

function draw() {
  if (!context) return
  context.clearRect(0, 0, world.width, world.height)
  drawBackground()
  world.platforms.forEach(drawPlatform)
  for (const particle of world.particles) {
    context.globalAlpha = Math.max(0, particle.life * 1.8)
    context.fillStyle = particle.color
    context.beginPath()
    context.arc(particle.x - world.cameraX, particle.y, particle.size, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 1
  drawPlayer()
}

function gameLoop(time) {
  const delta = Math.min((time - previousTime) / 1000 || 0, 0.034)
  previousTime = time
  update(delta, time)
  draw()
  animationFrame = requestAnimationFrame(gameLoop)
}
function resizeCanvas() {
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(rect.width * ratio)
  canvas.height = Math.round(rect.height * ratio)
  context.setTransform(canvas.width / world.width, 0, 0, canvas.height / world.height, 0, 0)
}

onMounted(async () => {
  await nextTick()
  canvas = canvasRef.value
  context = canvas.getContext('2d')
  setupWorld()
  resizeObserver = new ResizeObserver(resizeCanvas)
  resizeObserver.observe(canvas)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  resizeCanvas()
  animationFrame = requestAnimationFrame(gameLoop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  audioContext?.close()
})
</script>

<style scoped>
.jump-page {
  width: min(1120px, 100%);
  margin: 0 auto;
}
.game-shell {
  position: relative;
  height: clamp(520px, calc(100vh - 10rem), 760px);
  min-height: 520px;
  overflow: hidden;
  border: 1px solid rgba(166, 143, 255, 0.22);
  border-radius: 28px;
  background: #171a38;
  box-shadow: 0 28px 75px rgba(18, 13, 49, 0.28);
  user-select: none;
  touch-action: none;
}
.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
}
.hud {
  position: absolute;
  top: 24px;
  left: 26px;
  display: flex;
  gap: 34px;
  color: white;
  pointer-events: none;
}
.hud-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2em;
  opacity: 0.48;
}
.score,
.best {
  font-family: 'Overpass', sans-serif;
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  margin-top: 4px;
}
.best {
  color: #bdb1ff;
}
.sound-button {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: white;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  transition: 0.2s ease;
}
.sound-button:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}
.sound-button svg {
  width: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.center-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(370px, calc(100% - 40px));
  padding: 34px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 26px;
  color: white;
  text-align: center;
  background: rgba(25, 23, 57, 0.72);
  box-shadow: 0 24px 60px rgba(4, 3, 16, 0.35);
  backdrop-filter: blur(20px);
  transform: translate(-50%, -50%);
}
.eyebrow {
  color: #a89aff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.24em;
}
.intro-card h1 {
  margin: 12px 0 6px;
  font-size: 48px;
  font-weight: 900;
  letter-spacing: 0.04em;
}
.center-card p {
  color: rgba(255, 255, 255, 0.63);
  font-size: 14px;
}
.center-card button {
  width: 100%;
  margin-top: 24px;
  padding: 13px 22px;
  border: 0;
  border-radius: 999px;
  color: white;
  font-weight: 800;
  background: linear-gradient(135deg, #8e7cf5, #6455d6);
  box-shadow: 0 12px 30px rgba(109, 89, 226, 0.38);
  transition: 0.2s ease;
}
.center-card button:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 36px rgba(109, 89, 226, 0.5);
}
.center-card small {
  display: block;
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 11px;
}
.result-card strong {
  display: block;
  margin: 8px 0 4px;
  color: #fff;
  font-family: 'Overpass', sans-serif;
  font-size: 68px;
  line-height: 1;
}
.tip {
  position: absolute;
  left: 50%;
  bottom: 28px;
  padding: 8px 16px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
  background: rgba(11, 10, 31, 0.4);
  transform: translateX(-50%);
  pointer-events: none;
}
.power-wrap {
  position: absolute;
  left: 50%;
  bottom: 34px;
  width: min(300px, 58%);
  text-align: center;
  opacity: 0;
  transform: translate(-50%, 10px);
  transition: 0.18s ease;
  pointer-events: none;
}
.power-wrap.visible {
  opacity: 1;
  transform: translate(-50%, 0);
}
.power-track {
  height: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.24);
}
.power-fill {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #53d9b2, #ffe276, #ff7896);
  transform-origin: left;
}
.power-wrap span {
  display: inline-block;
  margin-top: 7px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.2em;
}
.game-notes {
  display: flex;
  justify-content: center;
  gap: 28px;
  padding: 18px 10px 4px;
  color: oklch(var(--bc) / 0.48);
  font-size: 12px;
}
.game-notes span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot-green {
  background: #39c6a2;
}
.dot-yellow {
  background: #f2c95c;
}
.dot-purple {
  background: #8e7cf5;
}
@media (max-width: 640px) {
  .game-shell {
    height: calc(100vh - 9.2rem);
    min-height: 470px;
    border-radius: 20px;
  }
  .hud {
    top: 18px;
    left: 18px;
    gap: 24px;
  }
  .sound-button {
    top: 17px;
    right: 17px;
  }
  .score,
  .best {
    font-size: 27px;
  }
  .center-card {
    padding: 28px 24px;
  }
  .intro-card h1 {
    font-size: 42px;
  }
  .game-notes {
    gap: 12px;
    justify-content: space-between;
  }
  .game-notes span {
    gap: 4px;
    font-size: 10px;
  }
}
</style>
