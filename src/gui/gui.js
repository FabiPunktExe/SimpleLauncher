const { app, BrowserWindow } = require('electron')
const { join, resolve } = require('path')

const openWindow = () => {
    const window = new BrowserWindow({
        webPreferences: {
            preload: resolve(join(__dirname, 'preload.js')),
            nodeIntegration: true,
            javascript: true,
            contextIsolation: true,
            sandbox: false
        },
        title: 'SimpleClient',
        icon: join(__dirname, 'logo.png')
    })
    window.setMenuBarVisibility(false)
    window.loadFile(join(__dirname, 'index.html'))
    window.maximize()
    app.on('window-all-closed', () => app.quit())
    return window
}

module.exports = {openWindow}