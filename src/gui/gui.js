const { app, BrowserWindow } = require('electron')
const { join, resolve } = require('path')

const openWindow = () => {
    const window = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            preload: resolve(join('src', 'gui', 'preload.js')),
            javascript: true
        },
        title: 'SimpleClient',
        icon: join(__dirname, 'logo.png')
    })
    window.removeMenu()
    window.loadFile(join(__dirname, 'index.html'))
    window.maximize()
    app.on('window-all-closed', () => app.quit())
    return window
}

module.exports = {openWindow}