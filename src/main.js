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

/*if (platform() == 'win32' || platform() == 'linux') {
    app.whenReady().then(() => {
        const window = openWindow()
        var accounts
        window.on('ready-to-show', () => {
            window.webContents.setZoomFactor(1)
            getSimpleClientVersions(versions => window.webContents.send('simpleclient_versions', versions))
            window.webContents.send('accounts', accounts = getAccounts())
        })
        ipcMain.on('login', event => {
            openAuthWindow(() => {})
        })
    })
} else {
    console.log('Your OS is not supported')
    exit(1)
}*/

const { Authflow, Titles } = require('prismarine-auth')

const userIdentifier = 'any unique identifier'
const cacheDir = './' // You can leave this as undefined unless you want to specify a caching directory
const flow = new Authflow(userIdentifier, cacheDir)
// Get a Minecraft Java Edition auth token, then log it
flow.getMinecraftJavaToken().then(console.log)