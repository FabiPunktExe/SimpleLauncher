const { platform } = require('os')
const { app, ipcMain } = require('electron')
const { openWindow } = require('./gui/gui')
const { exit } = require('process')
const { getSimpleClientVersions } = require('./minecraft')
const { openAuthWindow, getAccounts } = require('./auth')
const { checkForUpdates, update } = require('./updater')

if (platform() == 'win32' || platform() == 'linux') {
    app.disableHardwareAcceleration()
    app.whenReady().then(() => {
        const window = openWindow()
        window.on('ready-to-show', async () => {
            if (await checkForUpdates()) {
                window.webContents.send('confirm', {channel: 'update', message: 'An update for SimpleLauncher is available.\nShould it be downloaded in the background?'})
            }
            window.webContents.setZoomFactor(1)
            getSimpleClientVersions(versions => window.webContents.send('simpleclient_versions', versions))
            window.webContents.send('accounts', getAccounts(), 0)
        })
        ipcMain.on('update', (event, shouldUpdate) => {if (shouldUpdate) update()})
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
                        require('./launch').launch(version,
                                                   getAccounts().find(account => account.uuid == uuid),
                                                   status => window.webContents.send('launch', status))
                    }
                });
            })
        })
    })
} else {
    console.log('Your OS is not supported')
    exit(1)
}