const { app, BrowserWindow } = require('electron')
const { join } = require('path')

const createWindow = () => {
    const win = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            javascript: true
        }
    })
    win.setIcon(join(__dirname, 'logo.png'))
    win.setMenuBarVisibility(false)
    win.setTitle('SimpleClient')
    win.loadFile(join(__dirname, 'index.html'))
    win.maximize()
}

app.whenReady().then(() => {
    createWindow()
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    })
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
})