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
            window.webContents.send('accounts', accounts = getAccounts())
        })
        ipcMain.on('login', event => {
            openAuthWindow(status => {
                if (status == 'done') {
                    window.webContents.send('auth', 'done')
                    window.webContents.send('accounts', accounts = getAccounts())
                }
            })
            window.webContents.send('auth', 'starting')
        })
    })
} else {
    console.log('Your OS is not supported')
    exit(1)
}

/*app.whenReady(() => {
    const auth = new Auth()
    console.log(auth.createLink())
    auth.launch("electron", {
        resizable: false,
        fullscreenable: false,
        width: 520,
        height: 700
    }).then(async xboxManager => {
        const token = await xboxManager.getMinecraft();
        console.log("MSMC Object: " + token.getToken().mcToken)
    })
})*/