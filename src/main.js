const { platform } = require('os')
const { app, ipcMain } = require('electron')
const { openWindow } = require('./gui/gui');
const { getJavaVersion, downloadJava } = require('./java');
const { exit } = require('process');
const { autoUpdater } = require('electron-updater');
const electronIsDev = require('electron-is-dev');
const { getDirectory } = require('./util');
const { getSimpleClientVersions } = require('./minecraft');

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
        })
    })
} else {
    console.log('Your OS is not supported')
    exit(1)
}