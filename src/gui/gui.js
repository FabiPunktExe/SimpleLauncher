const { app, BrowserWindow } = require('electron')
const { join } = require('path')

const openWindow = () => {
    const window = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
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