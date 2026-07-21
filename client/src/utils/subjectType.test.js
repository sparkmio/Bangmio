import { describe, it, expect } from 'vitest'
import {
  getStatusLabels,
  getStatusOptions,
  SUBJECT_TYPE_NAMES,
  STATUS_LABELS_BY_TYPE
} from './subjectType'

describe('subjectType utility', () => {
  describe('SUBJECT_TYPE_NAMES', () => {
    it('包含 1/2/3/4/6 的映射', () => {
      expect(SUBJECT_TYPE_NAMES[1]).toBe('书籍')
      expect(SUBJECT_TYPE_NAMES[2]).toBe('动画')
      expect(SUBJECT_TYPE_NAMES[3]).toBe('音乐')
      expect(SUBJECT_TYPE_NAMES[4]).toBe('游戏')
      expect(SUBJECT_TYPE_NAMES[6]).toBe('三次元')
    })
  })

  describe('getStatusLabels', () => {
    it('返回书籍用语 (subjectType=1)', () => {
      expect(getStatusLabels(1)).toEqual({
        wish: '想读',
        collect: '在读',
        do: '读过',
        on_hold: '搁置',
        dropped: '抛弃'
      })
    })

    it('返回动画用语 (subjectType=2)', () => {
      expect(getStatusLabels(2)).toEqual({
        wish: '想看',
        collect: '在看',
        do: '看过',
        on_hold: '搁置',
        dropped: '抛弃'
      })
    })

    it('返回音乐用语 (subjectType=3)', () => {
      expect(getStatusLabels(3)).toEqual({
        wish: '想听',
        collect: '在听',
        do: '听过',
        on_hold: '搁置',
        dropped: '抛弃'
      })
    })

    it('返回游戏用语 (subjectType=4)', () => {
      expect(getStatusLabels(4)).toEqual({
        wish: '想玩',
        collect: '在玩',
        do: '玩过',
        on_hold: '搁置',
        dropped: '抛弃'
      })
    })

    it('返回三次元用语 (subjectType=6)，同动画', () => {
      const result = getStatusLabels(6)
      expect(result).toEqual({
        wish: '想看',
        collect: '在看',
        do: '看过',
        on_hold: '搁置',
        dropped: '抛弃'
      })
      // 与动画用语完全一致
      expect(result).toEqual(getStatusLabels(2))
    })

    it('未知 type (999) 返回默认动画用语', () => {
      const result = getStatusLabels(999)
      expect(result).toEqual({
        wish: '想看',
        collect: '在看',
        do: '看过',
        on_hold: '搁置',
        dropped: '抛弃'
      })
      expect(result).toEqual(STATUS_LABELS_BY_TYPE[2])
    })

    it('未定义 subjectType (undefined) 返回默认动画用语', () => {
      expect(getStatusLabels(undefined)).toEqual(STATUS_LABELS_BY_TYPE[2])
    })
  })

  describe('getStatusOptions', () => {
    it('返回 5 个选项 (subjectType=2 动画)', () => {
      const options = getStatusOptions(2)
      expect(options).toHaveLength(5)
      expect(options.map(o => o.value)).toEqual([1, 2, 3, 4, 5])
      expect(options.map(o => o.label)).toEqual(['想看', '在看', '看过', '搁置', '抛弃'])
    })

    it('每个选项包含 value 与 label 字段', () => {
      const options = getStatusOptions(2)
      options.forEach(opt => {
        expect(opt).toHaveProperty('value')
        expect(opt).toHaveProperty('label')
        expect(typeof opt.value).toBe('number')
        expect(typeof opt.label).toBe('string')
      })
    })

    it('value 从 1 到 5 连续', () => {
      const options = getStatusOptions(2)
      expect(options.map(o => o.value)).toEqual([1, 2, 3, 4, 5])
    })

    it('label 对应动画用语', () => {
      const labels = getStatusLabels(2)
      const options = getStatusOptions(2)
      expect(options[0].label).toBe(labels.wish)
      expect(options[1].label).toBe(labels.collect)
      expect(options[2].label).toBe(labels.do)
      expect(options[3].label).toBe(labels.on_hold)
      expect(options[4].label).toBe(labels.dropped)
    })

    it('未知 type 返回默认动画选项', () => {
      const options = getStatusOptions(999)
      expect(options).toHaveLength(5)
      expect(options.map(o => o.label)).toEqual(['想看', '在看', '看过', '搁置', '抛弃'])
    })

    it('subjectType=4 (游戏) label 对应游戏用语', () => {
      const options = getStatusOptions(4)
      expect(options.map(o => o.label)).toEqual(['想玩', '在玩', '玩过', '搁置', '抛弃'])
    })
  })

  describe('STATUS_LABELS_BY_TYPE', () => {
    it('包含 1/2/3/4/6 五种类型', () => {
      expect(STATUS_LABELS_BY_TYPE[1]).toBeDefined()
      expect(STATUS_LABELS_BY_TYPE[2]).toBeDefined()
      expect(STATUS_LABELS_BY_TYPE[3]).toBeDefined()
      expect(STATUS_LABELS_BY_TYPE[4]).toBeDefined()
      expect(STATUS_LABELS_BY_TYPE[6]).toBeDefined()
    })

    it('每种类型包含 5 个状态字段', () => {
      for (const key of [1, 2, 3, 4, 6]) {
        const labels = STATUS_LABELS_BY_TYPE[key]
        expect(labels).toHaveProperty('wish')
        expect(labels).toHaveProperty('collect')
        expect(labels).toHaveProperty('do')
        expect(labels).toHaveProperty('on_hold')
        expect(labels).toHaveProperty('dropped')
      }
    })

    it('所有类型的 on_hold 与 dropped 用语一致', () => {
      for (const key of [1, 2, 3, 4, 6]) {
        expect(STATUS_LABELS_BY_TYPE[key].on_hold).toBe('搁置')
        expect(STATUS_LABELS_BY_TYPE[key].dropped).toBe('抛弃')
      }
    })
  })
})
