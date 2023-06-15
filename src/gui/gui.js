const { app, BrowserWindow } = require('electron')
const { join, resolve } = require('path')

const openWindow = () => {
    const window = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            preload: resolve(join('src', 'gui', 'preload.js')),
            javascript: true
        }
    })
    window.setIcon(join(__dirname, 'logo.png'))
    window.setMenuBarVisibility(false)
    window.setTitle('SimpleClient')
    window.loadFile(join(__dirname, 'index.html'))
    window.maximize()
    app.on('window-all-closed', () => app.quit())
    return window
}

module.exports = {openWindow}