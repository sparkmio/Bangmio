/**
 * Task 13: CollectionButton 状态同步逻辑测试
 *
 * 依赖说明：
 *   本测试依赖 `@vue/test-utils` 与 `jsdom` 环境，但项目当前未安装该依赖。
 *   运行前需先安装：
 *     cd client && npm install -D @vue/test-utils jsdom
 *   并为 .vue 组件测试启用 jsdom 环境（修改 vitest.config.js）：
 *     test: {
 *       environment: 'jsdom',
 *       // 或使用 environmentMatchGlobs 区分纯函数测试（node）与组件测试（jsdom）
 *     }
 *
 *   依赖缺失时，所有用例会被 describe.skip 自动跳过，不影响其它测试文件。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// 动态加载可选依赖；缺失时跳过整套测试
let mount = null
let CollectionButton = null
let dependencyMissing = false

try {
  const vueTestUtils = await import('@vue/test-utils')
  mount = vueTestUtils.mount
  CollectionButton = (await import('./CollectionButton.vue')).default
} catch {
  dependencyMissing = true
}

function makeProps(overrides = {}) {
  return {
    modelValue: 0,
    subjectType: 2,
    epStatus: 0,
    comment: '',
    tags: [],
    score: 0,
    ...overrides
  }
}

const suite = dependencyMissing ? describe.skip : describe

suite('CollectionButton / 状态同步逻辑', () => {
  let wrapper

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    if (wrapper) wrapper.unmount()
  })

  /**
   * 打开下拉菜单并点击第 optionIndex 个状态选项
   * 状态选项按钮带 .flex 类（与「移除收藏」按钮的 .text-error 类区分）
   */
  async function openMenuAndClickOption(w, optionIndex) {
    await w.find('button.btn-sm').trigger('click')
    const options = w.findAll('.menu button.flex')
    await options[optionIndex].trigger('click')
  }

  it('未修改状态时不触发 emit', async () => {
    wrapper = mount(CollectionButton, { props: makeProps({ modelValue: 2 }) })
    // 推进 500ms，期间无任何用户操作
    vi.advanceTimersByTime(500)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('修改 type 触发 emit update:modelValue', async () => {
    wrapper = mount(CollectionButton, { props: makeProps({ modelValue: 0 }) })
    // 点击「想看」(statusOptions[0], value=1)
    await openMenuAndClickOption(wrapper, 0)
    // 防抖窗口未到，尚未触发
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    // 推进 500ms，触发防抖回调
    vi.advanceTimersByTime(500)
    const updates = wrapper.emitted('update:modelValue')
    expect(updates).toBeTruthy()
    expect(updates).toHaveLength(1)
    expect(updates[0][0]).toBe(1)
  })

  it('连续修改 500ms 内仅触发一次 emit (防抖)', async () => {
    wrapper = mount(CollectionButton, { props: makeProps({ modelValue: 0 }) })
    // 连续点击 3 个不同状态：1 / 2 / 3
    await openMenuAndClickOption(wrapper, 0) // value=1
    vi.advanceTimersByTime(200)
    await openMenuAndClickOption(wrapper, 1) // value=2
    vi.advanceTimersByTime(200)
    await openMenuAndClickOption(wrapper, 2) // value=3
    // 防抖窗口未结束，不应触发
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    // 推进到防抖结束
    vi.advanceTimersByTime(500)
    const updates = wrapper.emitted('update:modelValue')
    expect(updates).toBeTruthy()
    expect(updates).toHaveLength(1)
    // emit 最后一次点击的值（防抖期间被覆盖）
    expect(updates[0][0]).toBe(3)
  })

  it('同步成功后 lastSyncedState 更新', async () => {
    wrapper = mount(CollectionButton, { props: makeProps({ modelValue: 0 }) })
    await openMenuAndClickOption(wrapper, 0) // value=1
    vi.advanceTimersByTime(500)
    // 同步后 lastSyncedState.type 应等于最后一次 emit 的值
    expect(wrapper.vm.lastSyncedState.type).toBe(1)
    // 刚同步完，hasStateChanged 应为 false
    expect(wrapper.vm.hasStateChanged()).toBe(false)
  })

  it('父组件回填 modelValue 后 pendingValue 与 lastSyncedState 同步', async () => {
    wrapper = mount(CollectionButton, { props: makeProps({ modelValue: 0 }) })
    await wrapper.setProps({ modelValue: 2 })
    expect(wrapper.vm.pendingValue).toBe(2)
    expect(wrapper.vm.lastSyncedState.type).toBe(2)
  })

  it('卸载前若有未同步变更会立即 flush', async () => {
    wrapper = mount(CollectionButton, { props: makeProps({ modelValue: 0 }) })
    await openMenuAndClickOption(wrapper, 0) // value=1，未等满 500ms
    // 卸载组件，onBeforeUnmount 内会 flush 未同步变更
    wrapper.unmount()
    const updates = wrapper.emitted('update:modelValue')
    expect(updates).toBeTruthy()
    expect(updates[0][0]).toBe(1)
  })
})
