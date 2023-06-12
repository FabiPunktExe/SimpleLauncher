const { platform } = require('os')
const { app } = require('electron')
const { openWindow } = require('./gui/gui');
const { getJavaVersion } = require('./java');
const { exit } = require('process');

if (platform() == 'win32' || platform() == 'linux') {
    app.whenReady().then(openWindow)
} else {
    console.log('Your OS is not supported')
    exit(1)
}