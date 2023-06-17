const { BrowserWindow } = require("electron")
const { readFileSync, existsSync, writeFileSync } = require("original-fs")
const { getDirectory } = require("./util")
const { join } = require("path")

var azureClientId = '116c8d52-e832-4ff4-b056-8018cf33a67f'
azureClientId = '1ce6e35a-126f-48fd-97fb-54d143ac6d45'
const redirectUrl = 'https://login.microsoftonline.com/common/oauth2/nativeclient'
const scope = 'XboxLive.signin offline_access'

var window
var success

const openAuthWindow = statusCallback => {
    if (window) statusCallback('already_open')
    window = new BrowserWindow({
        title: 'Microsoft Login',
        backgroundColor: '#222222',
        width: 520,
        height: 600,
        frame: true,
        icon: join(__dirname, 'gui', 'logo.png')
    })
    window.on('closed', () => window = undefined)
    window.on('close', () => {if (!success) statusCallback('canceled')})
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
                        expiration: new Date(xstsAccessToken.NotAfter).getTime()
                    }],
                    minecraft_access_tokens: [{
                        token: minecraftAccessToken,
                        expiration: time + minecraftData.expires_in * 1000
                    }]
                })
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

const getMicrosoftAccessToken = async refreshToken => {
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
    if (response && response.ok) {
        const json = await response.json()
        return json.access_token
    } else return undefined
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

const addAccount = account => {
    const file = join(getDirectory(), 'accounts.json')
    const accounts = existsSync(file) ? JSON.parse(readFileSync(file)) : []
    accounts.push(account)
    writeFileSync(file, JSON.stringify(accounts))
}

module.exports = {openAuthWindow, getAccounts, getAccount, addAccount}