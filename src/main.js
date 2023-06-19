const { platform } = require('os')
const { app, ipcMain } = require('electron')
const { openWindow } = require('./gui/gui');
const { exit } = require('process');
const { autoUpdater } = require('electron-updater');
const electronIsDev = require('electron-is-dev');
const { getSimpleClientVersions, launch } = require('./minecraft');
const { loadAccounts, openAuthWindow, getAccounts } = require('./auth');

if (!electronIsDev) {
    autoUpdater.allowPrerelease = true;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
}

if (platform() == 'win32' || platform() == 'linux') {
    app.whenReady().then(() => {
        const window = openWindow()
        window.on('ready-to-show', () => {
            window.webContents.setZoomFactor(1)
            getSimpleClientVersions(versions => window.webContents.send('simpleclient_versions', versions))
            window.webContents.send('accounts', getAccounts(), 0)
        })
        ipcMain.on('login', event => {
            openAuthWindow((status, selectedAccount) => {
                window.webContents.send('auth', status)
                if (status == 'done') {
                    window.webContents.send('accounts', getAccounts(), selectedAccount)
                }
            })
        })
        ipcMain.on('launch', (event, data) => {
            const versionId = data.versionId
            const uuid = data.uuid
            getSimpleClientVersions(versions => {
                versions.forEach(version => {
                    if (version.id == versionId) {
                        launch(version, getAccounts().find(account => account.uuid == uuid), status => window.webContents.send('launch', status))
                    }
                });
            })
        })
    })
} else {
    console.log('Your OS is not supported')
    exit(1)
}