const { BrowserWindow } = require("electron")
const { readFileSync, existsSync, writeFileSync } = require("original-fs")
const { getDirectory } = require("./util")
const { join } = require("path")

var azureClientId = '116c8d52-e832-4ff4-b056-8018cf33a67f'
azureClientId = '1ce6e35a-126f-48fd-97fb-54d143ac6d45'
const redirectUrl = 'https://login.microsoftonline.com/common/oauth2/nativeclient'
const scope = 'XboxLive.signin offline_access'
var selectedAccount = 0
var accounts
var window
var success

const loadAccounts = () => accounts = getAccounts()

const openAuthWindow = statusCallback => {
    if (window) return
    statusCallback('starting')
    window = new BrowserWindow({
        title: 'Microsoft Login',
        backgroundColor: '#222222',
        width: 520,
        height: 600,
        frame: true,
        icon: join(__dirname, 'gui', 'logo.png')
    })
    window.on('closed', () => window = undefined)
    window.on('close', () => {if (!success) statusCallback('cancelled')})
    window.webContents.on('did-navigate', async (event, url) => {
        if (url.startsWith(`${redirectUrl}?`)) {
            if (url.includes('code=')) {
                success = true
                window.close()
                window = undefined
                statusCallback('success')
                const authorizationCode = url.split('?')[1].split('&').find(data => data.startsWith('code=')).split('=')[1]
                if (!authorizationCode) {statusCallback('error'); return}
                const microsoftData = await getMicrosoftData(authorizationCode)
                if (!microsoftData) {statusCallback('error'); return}
                const microsoftAccessToken = microsoftData.access_token
                const microsoftRefreshToken = microsoftData.refresh_token
                const xboxLiveData = await getXboxLiveData(microsoftAccessToken)
                if (!xboxLiveData) {statusCallback('error'); return}
                const xboxLiveAccessToken = xboxLiveData.Token
                if (xboxLiveData.DisplayClaims.xui.length == 0) {statusCallback('error'); return}
                const userhash = xboxLiveData.DisplayClaims.xui[0].uhs
                const xstsData = await getXSTSData(xboxLiveAccessToken)
                if (!xstsData) {statusCallback('error'); return}
                const xstsAccessToken = xstsData.Token
                const minecraftData = await getMinecraftData(userhash, xstsAccessToken)
                if (!minecraftData) {statusCallback('error'); return}
                const minecraftAccessToken = minecraftData.access_token
                const minecraftProfile = await getMinecraftProfile(minecraftAccessToken)
                if (!minecraftProfile) {statusCallback('error'); return}
                const time = new Date().getTime()
                addAccount({
                    uuid: minecraftProfile.id,
                    name: minecraftProfile.name,
                    microsoft_refresh_token: microsoftRefreshToken,
                    microsoft_access_tokens: [{
                        token: microsoftAccessToken,
                        expiration: time + microsoftData.expires_in * 1000
                    }],
                    xbox_access_tokens: [{
                        token: xboxLiveAccessToken,
                        expiration: new Date(xboxLiveData.NotAfter).getTime(),
                        userhash: userhash
                    }],
                    xsts_access_tokens: [{
                        token: xstsAccessToken,
                        expiration: new Date(xstsData.NotAfter).getTime()
                    }],
                    minecraft_access_tokens: [{
                        token: minecraftAccessToken,
                        expiration: time + minecraftData.expires_in * 1000
                    }]
                })
                statusCallback('done', selectedAccount)
            } else window.close()
        }
    })
    window.removeMenu();
    window.loadURL(encodeURI('https://login.microsoft.com/consumers/oauth2/v2.0/authorize?'
                           + 'prompt=select_account&'
                           + `client_id=${azureClientId}&`
                           + 'response_type=code&'
                           + `scope=${scope}&`
                           + `redirect_uri=${redirectUrl}`))
}

const getAccounts = () => {
    const file = join(getDirectory(), 'accounts.json')
    if (!existsSync(file)) writeFileSync(file, '[]')
    return JSON.parse(readFileSync(file))
}

const getAccount = (accounts, uuid) => {
    return accounts.find(account => account.uuid == uuid)
}

const getAccountIndex = (accounts, uuid) => {
    return accounts.findIndex(account => account.uuid == uuid)
}

const addAccount = account => {
    const file = join(getDirectory(), 'accounts.json')
    accounts = existsSync(file) ? JSON.parse(readFileSync(file)) : []
    const index = getAccountIndex(accounts, account.uuid)
    if (index == -1) {
        accounts.push(account)
        writeFileSync(file, JSON.stringify(accounts))
        selectedAccount = accounts.length - 1
    } else selectedAccount = index
}

const removeAccount = uuid => {
    const file = join(getDirectory(), 'accounts.json')
    accounts = existsSync(file) ? JSON.parse(readFileSync(file)) : []
    accounts = accounts.filter(account => account.uuid != uuid)
    writeFileSync(file, JSON.stringify(accounts))
    selectedAccount = 0
}

const getMicrosoftData = async authorizationCode => {
    const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token?', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            client_id: azureClientId,
            scope: scope,
            code: authorizationCode,
            redirect_uri: redirectUrl,
            grant_type: 'authorization_code'
        })
    })
    if (response && response.ok) return await response.json()
    else return undefined
}

const getMicrosoftDataByRefreshToken = async refreshToken => {
    const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token?', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            client_id: azureClientId,
            scope: scope,
            refresh_token: refreshToken,
            redirect_uri: redirectUrl,
            grant_type: 'authorization_code'
        })
    })
    if (response && response.ok) return await response.json()
    else return undefined
}

const getXboxLiveData = async microsoftAccessToken => {
    const response = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify({
            Properties: {
                AuthMethod: 'RPS',
                SiteName: 'user.auth.xboxlive.com',
                RpsTicket: `d=${microsoftAccessToken}`
            },
            RelyingParty: 'http://auth.xboxlive.com',
            TokenType: 'JWT'
        })
    })
    if (response && response.ok) return await response.json()
    else return undefined
}

const getXSTSData = async xboxLiveAccessToken => {
    const response = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify({
            Properties: {
                SandboxId: 'RETAIL',
                UserTokens: [xboxLiveAccessToken]
            },
            RelyingParty: 'rp://api.minecraftservices.com/',
            TokenType: 'JWT'
        })
    })
    if (response && response.ok) return await response.json()
    else return undefined
}

const getMinecraftData = async (userhash, xstsAccessToken) => {
    const response = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify({
            identityToken: `XBL3.0 x=${userhash};${xstsAccessToken}`
        })
    })
    if (response && response.ok) return await response.json()
    else return undefined
}

const getMinecraftProfile = async minecraftAccessToken => {
    const response = await fetch('https://api.minecraftservices.com/minecraft/profile', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${minecraftAccessToken}`
        }
    })
    if (response && response.ok) return await response.json()
    else return undefined
}

const refreshTokens = async account => {
    var time = new Date().getTime()
    if (account.minecraft_access_tokens.find(token => token.expiration > time)) return true
    var xstsAccessToken = account.xsts_access_tokens.find(token => token.expiration > time)
    var userhash = account.xbox_access_tokens.find(token => token.expiration > time).userhash
    if (!xstsAccessToken) {
        var xboxLiveAccessToken = account.xbox_access_tokens.find(token => token.expiration > time).token
        if (!xboxLiveAccessToken) {
            var microsoftAccessToken = account.microsoft_access_tokens.find(token => token.expiration > time)
            if (!microsoftAccessToken) {
                var microsoftData = await getMicrosoftDataByRefreshToken(account.microsoft_refresh_token)
                if (!microsoftData) return false
                microsoftAccessToken = microsoftData.access_token
                account.microsoft_access_tokens = [{
                    token: microsoftAccessToken,
                    expiration: time + microsoftData.expires_in * 1000
                }]
            }
            var xboxLiveData = await getXboxLiveData(microsoftAccessToken)
            if (!xboxLiveData) return false
            xboxLiveAccessToken = xboxLiveData.Token
            if (xboxLiveData.DisplayClaims.xui.length == 0) return false
            userhash = xboxLiveData.DisplayClaims.xui[0].uhs
            account.xbox_access_tokens = [{
                token: xstsAccessToken,
                expiration: new Date(xboxLiveData.NotAfter).getTime(),
                userhash: userhash
            }]
        }
        var xstsData = await getXSTSData(xboxLiveAccessToken)
        if (!xstsData) return false
        xstsAccessToken = xstsData.Token
        account.xsts_access_tokens = [{
            token: xstsAccessToken,
            expiration: new Date(xstsData.NotAfter).getTime()
        }]
    }
    var minecraftData = await getMinecraftData(userhash, xstsAccessToken)
    if (!minecraftData) return false
    var minecraftAccessToken = minecraftData.access_token
    account.minecraft_access_tokens = [{
        token: minecraftAccessToken,
        expiration: time + minecraftData.expires_in * 1000
    }]
    var minecraftProfile = await getMinecraftProfile(minecraftAccessToken)
    if (!minecraftProfile) return false
    removeAccount(account.uuid)
    account.uuid = minecraftProfile.id
    addAccount(account)
    return true
}

module.exports = {openAuthWindow, getAccounts, getAccount, addAccount, selectedAccount, refreshTokens, accounts, loadAccounts}