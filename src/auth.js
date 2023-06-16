const { BrowserWindow } = require("electron")
const { readFileSync, existsSync, writeFileSync } = require("original-fs")
const { getDirectory } = require("./util")
const { join } = require("path")

const azureClientId = '116c8d52-e832-4ff4-b056-8018cf33a67f'

var window
var success
const openAuthWindow = callback => {
    if (window) callback('already_open')
    window = new BrowserWindow({
        title: 'Microsoft Login',
        backgroundColor: '#222222',
        width: 520,
        height: 600,
        frame: true,
        icon: join(__dirname, 'gui', 'logo.png')
    })
    window.on('closed', () => window = undefined)
    window.on('close', () => {if (!success) callback('canceled')})
    window.webContents.on('did-navigate', (_, uri) => {
        if (uri.startsWith('https://login.microsoftonline.com/common/oauth2/nativeclient')) {
            success = true
            window.close()
            window = null
            callback('success')
        }
    })
    window.removeMenu()
    window.loadURL(`https://login.microsoft.com/consumers/oauth2/v2.0/authorize?prompt=select_account&client_id=${azureClientId}&response_type=code&scope=XboxLive.signin%20offline_access&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient`)
}

const getAccounts = () => {
    const file = join(getDirectory(), 'accounts.json')
    if (!existsSync(file)) writeFileSync(file, '[]')
    return JSON.parse(readFileSync(file))
}

const getAccount = (accounts, uuid) => {
    return accounts.find(account => account.uuid == uuid)
}

module.exports = {openAuthWindow, getAccounts, getAccount}