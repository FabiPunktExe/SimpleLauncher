const { platform } = require('os')
const { app, ipcMain } = require('electron')
const { openWindow } = require('./gui/gui');
const { exit } = require('process');
const { autoUpdater } = require('electron-updater');
const electronIsDev = require('electron-is-dev');
const { getSimpleClientVersions } = require('./minecraft');
const { getAccounts, openAuthWindow } = require('./auth');

if (!electronIsDev) {
    autoUpdater.allowPrerelease = true;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
}

if (platform() == 'win32' || platform() == 'linux') {
    app.whenReady().then(() => {
        const window = openWindow()
        var accounts
        window.on('ready-to-show', () => {
            window.webContents.setZoomFactor(1)
            getSimpleClientVersions(versions => window.webContents.send('simpleclient_versions', versions))
            accounts = getAccounts()
            window.webContents.send('accounts', accounts, 0)
        })
        ipcMain.on('login', event => {
            openAuthWindow((status, selectedAccount) => {
                window.webContents.send('auth', status)
                if (status == 'done') {
                    accounts = getAccounts()
                    window.webContents.send('accounts', accounts, selectedAccount)
                }
            })
        })
    })
} else {
    console.log('Your OS is not supported')
    exit(1)
}