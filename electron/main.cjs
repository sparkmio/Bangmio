const { app, BrowserWindow, shell, globalShortcut, ipcMain } = require('electron')
const path = require('path')
const http = require('http')

let mainWindow
let oauthServer = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../client/public/logo.png'),
    title: 'Bangmio'
  })

  mainWindow.loadFile(path.join(__dirname, '../client/dist/index.html'))

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startOAuthServer() {
  return new Promise((resolve, reject) => {
    if (oauthServer) {
      oauthServer.close()
      oauthServer = null
    }

    oauthServer = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:5173')

      if (url.pathname === '/login/callback') {
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Bangmio - 授权完成</title>
          <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5}
          .box{text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
          h2{margin:0 0 0.5rem}p{color:#666;font-size:14px}</style></head>
          <body><div class="box">
            <h2>${error ? '授权失败' : '授权成功！'}</h2>
            <p>${error ? '请返回应用重试' : '请返回应用继续使用，此窗口可关闭'}</p>
          </div></body></html>
        `)

        if (code && mainWindow) {
          mainWindow.webContents.send('oauth-code', code)
        }

        setTimeout(() => {
          if (oauthServer) {
            oauthServer.close()
            oauthServer = null
          }
        }, 5000)
      } else {
        res.writeHead(404)
        res.end('Not found')
      }
    })

    oauthServer.on('error', (err) => {
      oauthServer = null
      reject(err)
    })

    oauthServer.listen(5173, '127.0.0.1', () => {
      resolve()
    })
  })
}

ipcMain.handle('start-oauth', async () => {
  try {
    await startOAuthServer()
    const redirectUri = 'http://localhost:5173/login/callback'
    const oauthUrl = `https://bgm.tv/oauth/authorize?client_id=bgm64516a3fcf799a59a&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`
    shell.openExternal(oauthUrl)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

app.whenReady().then(() => {
  createWindow()
  globalShortcut.register('CommandOrControl+Q', () => {
    if (mainWindow) mainWindow.close()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
