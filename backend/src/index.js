const BANGUMI_API_BASE = 'https://api.bgm.tv'

// Auth storage (in-memory, reset on worker restart)
const tokens = new Map()
const states = new Map()

// Generate random string for state
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

// Generate simple token
function generateToken(user) {
  const token = generateRandomString(32)
  tokens.set(token, {
    user,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  })
  return token
}

// Verify token
function verifyToken(token) {
  const data = tokens.get(token)
  if (!data) return null
  if (data.expiresAt < Date.now()) {
    tokens.delete(token)
    return null
  }
  return data
}

// Clean expired tokens (simple garbage collection)
function cleanExpiredTokens() {
  const now = Date.now()
  for (const [token, data] of tokens.entries()) {
    if (data.expiresAt < now) {
      tokens.delete(token)
    }
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  const searchParams = url.searchParams

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  // API routes
  if (path.startsWith('/api/search')) {
    return handleSearch(request)
  }

  if (path.startsWith('/api/anime/')) {
    const id = path.split('/').pop()
    return handleAnimeDetail(request, id)
  }

  if (path.startsWith('/api/subject/')) {
    const id = path.split('/').pop()
    return handleSubjectDetail(request, id)
  }

  // Auth routes
  if (path.startsWith('/api/auth/')) {
    return handleAuth(request)
  }

  // Health check
  if (path === '/api/health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Not found
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleSearch(request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q') || ''
  const type = url.searchParams.get('type') || '2' // 2 for anime
  
  try {
    const bangumiUrl = `${BANGUMI_API_BASE}/search/subject/${encodeURIComponent(query)}?type=${type}`
    const response = await fetch(bangumiUrl, {
      headers: {
        'User-Agent': 'BangumiManager/1.0 (https://github.com/yourusername/bangumi-manager)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Bangumi API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Transform Bangumi API response to our format
    const transformed = data.list?.map(item => ({
      id: item.id,
      name: item.name,
      name_cn: item.name_cn,
      image: item.images?.large || item.images?.common || item.images?.medium || item.images?.small,
      desc: item.summary ? item.summary.substring(0, 200) + '...' : 'No description',
      type: item.type,
      score: item.score,
      total_episodes: item.total_episodes,
      air_date: item.air_date,
    })) || []
    
    return new Response(JSON.stringify({
      results: transformed,
      total: data.total || 0,
      page: data.page || 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Search error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch search results',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

async function handleAnimeDetail(request, id) {
  try {
    const bangumiUrl = `${BANGUMI_API_BASE}/v0/subjects/${id}`
    const response = await fetch(bangumiUrl, {
      headers: {
        'User-Agent': 'BangumiManager/1.0 (https://github.com/yourusername/bangumi-manager)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Bangumi API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Transform Bangumi API response to our format
    const transformed = {
      id: data.id,
      name: data.name,
      name_cn: data.name_cn,
      image: data.images?.large || data.images?.common || data.images?.medium || data.images?.small,
      description: data.summary || 'No description',
      type: data.type,
      total_episodes: data.total_episodes || 0,
      status: getStatus(data),
      rating: data.rating?.score || 0,
      overview: data.summary || '',
      characters: [],
      episodes: []
    }
    
    return new Response(JSON.stringify(transformed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Anime detail error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch anime details',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

async function handleSubjectDetail(request, id) {
  try {
    const bangumiUrl = `${BANGUMI_API_BASE}/v0/subjects/${id}`
    const response = await fetch(bangumiUrl, {
      headers: {
        'User-Agent': 'BangumiManager/1.0 (https://github.com/yourusername/bangumi-manager)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Bangumi API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Subject detail error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch subject details',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

function getStatus(data) {
  if (data.air_date) {
    const airDate = new Date(data.air_date)
    const now = new Date()
    if (airDate > now) return 'Not yet aired'
    if (data.total_episodes && data.eps && data.eps >= data.total_episodes) return 'Finished'
    return 'Airing'
  }
  return 'Unknown'
}

// Auth handler
async function handleAuth(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  // Clean expired tokens periodically
  cleanExpiredTokens()
  
  if (path === '/api/auth/bangumi/authorize') {
    return handleAuthAuthorize(request)
  }
  
  if (path === '/api/auth/bangumi/callback') {
    return handleAuthCallback(request)
  }
  
  if (path === '/api/auth/me') {
    return handleAuthMe(request)
  }
  
  if (path === '/api/auth/logout') {
    return handleAuthLogout(request)
  }
  
  return new Response(JSON.stringify({ error: 'Auth endpoint not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Generate Bangumi OAuth authorization URL
async function handleAuthAuthorize(request) {
  const state = generateRandomString(16)
  const redirectUri = new URL('/api/auth/bangumi/callback', request.url).toString()
  
  states.set(state, {
    createdAt: Date.now(),
    redirectUri
  })
  
  const authUrl = new URL('https://bgm.tv/oauth/authorize')
  authUrl.searchParams.set('client_id', BANGUMI_CLIENT_ID || '')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  
  return new Response(JSON.stringify({ url: authUrl.toString() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Handle OAuth callback
async function handleAuthCallback(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  
  try {
    const { code, state } = await request.json()
    
    // Verify state
    const stateData = states.get(state)
    if (!stateData) {
      throw new Error('Invalid state parameter')
    }
    states.delete(state) // One-time use
    
    // Exchange code for access token
    const tokenUrl = 'https://bgm.tv/oauth/access_token'
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('client_id', BANGUMI_CLIENT_ID || '')
    params.append('client_secret', BANGUMI_CLIENT_SECRET || '')
    params.append('code', code)
    params.append('redirect_uri', stateData.redirectUri)
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Bangmio/1.0 (https://bangmio.pzhhuhu.workers.dev)'
      },
      body: params
    })
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }
    
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    
    // Get user info from Bangumi
    const userResponse = await fetch('https://api.bgm.tv/v0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Bangmio/1.0 (https://bangmio.pzhhuhu.workers.dev)'
      }
    })
    
    if (!userResponse.ok) {
      throw new Error(`Failed to get user info: ${userResponse.status}`)
    }
    
    const userData = await userResponse.json()
    
    // Prepare user object for frontend
    const user = {
      id: userData.id,
      username: userData.username,
      nickname: userData.nickname,
      avatar: userData.avatar?.large || userData.avatar?.medium || userData.avatar?.small,
      sign: userData.sign || '',
      url: userData.url
    }
    
    // Create our own token with full user object
    const ourToken = generateToken(user)
    
    return new Response(JSON.stringify({ token: ourToken, user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Auth callback error:', error)
    return new Response(JSON.stringify({ 
      error: 'Authentication failed',
      message: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

// Get current user info
async function handleAuthMe(request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  
  const token = authHeader.substring(7)
  const tokenData = verifyToken(token)
  
  if (!tokenData) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  
  // Return stored user object
  return new Response(JSON.stringify({ user: tokenData.user }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Logout
async function handleAuthLogout(request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    tokens.delete(token)
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Worker entry point
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})