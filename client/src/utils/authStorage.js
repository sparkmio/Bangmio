/**
 * 认证相关 localStorage 读写集中管理（PROJECT_ISSUES 3.2）。
 *
 * auth store 与 api 拦截器原先散落 6 个 key 的直接读写，
 * 统一收敛到本模块，key 定义与迁移逻辑各只有一份。
 */

export const AUTH_KEYS = {
  bangmioToken: 'bangmio_token',
  bangmioUser: 'bangmio_user',
  bgmTokenCached: 'bgm_token_cached',
  bgmUserProfile: 'bgm_user_profile',
  bangumiToken: 'bangumi_token',
  bangumiUser: 'bangumi_user'
}

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function writeJSON(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

/**
 * 旧 key 迁移：旧版本曾把 Bangumi token/user 存在 bangmio_token/bangmio_user 中。
 * 非 JWT 的旧值迁移到 bangumi_token/bangumi_user；旧 Bangumi user（无 email 字段）同理。
 * 幂等：执行后旧 key 被清空，重复调用无副作用。
 */
export function migrateOldAuthKeys() {
  try {
    const oldToken = localStorage.getItem(AUTH_KEYS.bangmioToken)
    const oldUser = localStorage.getItem(AUTH_KEYS.bangmioUser)
    // JWT 格式：三段 base64 以点分隔
    const isJwt = oldToken && oldToken.split('.').length === 3
    if (oldToken && !isJwt) {
      if (!localStorage.getItem(AUTH_KEYS.bangumiToken)) {
        localStorage.setItem(AUTH_KEYS.bangumiToken, oldToken)
      }
      localStorage.removeItem(AUTH_KEYS.bangmioToken)
    }
    if (oldUser) {
      try {
        const parsed = JSON.parse(oldUser)
        // 旧 Bangumi user 有 username 字段，新 Bangmio user 有 email 字段
        if (parsed && !parsed.email) {
          if (!localStorage.getItem(AUTH_KEYS.bangumiUser)) {
            localStorage.setItem(AUTH_KEYS.bangumiUser, oldUser)
          }
          localStorage.removeItem(AUTH_KEYS.bangmioUser)
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // localStorage 不可用（如隐私模式）时静默跳过
  }
}

export const authStorage = {
  // ===== 读取 =====
  getBangmioToken: () => localStorage.getItem(AUTH_KEYS.bangmioToken) || '',
  getBangmioUser: () => readJSON(AUTH_KEYS.bangmioUser),
  getBgmTokenCached: () => localStorage.getItem(AUTH_KEYS.bgmTokenCached) || '',
  getBgmUserProfile: () => readJSON(AUTH_KEYS.bgmUserProfile),
  getBangumiToken: () => localStorage.getItem(AUTH_KEYS.bangumiToken) || '',
  getBangumiUser: () => readJSON(AUTH_KEYS.bangumiUser),

  // ===== 写入 =====
  setBangmioToken: token => localStorage.setItem(AUTH_KEYS.bangmioToken, token || ''),
  setBangmioUser: user => writeJSON(AUTH_KEYS.bangmioUser, user),
  setBgmTokenCached: token =>
    token
      ? localStorage.setItem(AUTH_KEYS.bgmTokenCached, token)
      : localStorage.removeItem(AUTH_KEYS.bgmTokenCached),
  setBgmUserProfile: profile => writeJSON(AUTH_KEYS.bgmUserProfile, profile),
  setBangumiToken: token => localStorage.setItem(AUTH_KEYS.bangumiToken, token || ''),
  setBangumiUser: user => writeJSON(AUTH_KEYS.bangumiUser, user),

  // ===== 清除 =====
  clearBangmio: () => {
    localStorage.removeItem(AUTH_KEYS.bangmioToken)
    localStorage.removeItem(AUTH_KEYS.bangmioUser)
    localStorage.removeItem(AUTH_KEYS.bgmTokenCached)
    localStorage.removeItem(AUTH_KEYS.bgmUserProfile)
  },
  clearBangumi: () => {
    localStorage.removeItem(AUTH_KEYS.bangumiToken)
    localStorage.removeItem(AUTH_KEYS.bangumiUser)
  },
  clearAll: () => {
    authStorage.clearBangmio()
    authStorage.clearBangumi()
  }
}
