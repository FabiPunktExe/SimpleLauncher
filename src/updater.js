const { platform } = require("os")
const { join, resolve } = require("path")
const { getDirectory } = require("./util")
const { execFile, spawnSync } = require("child_process")
const { existsSync, mkdirSync, readFileSync } = require("fs")
const { path } = require("app-root-path")
const { isMainThread } = require("worker_threads")

const repository = 'FabiPunktExe/SimpleLauncher'

const log = (...data) => console.log('[Updater] ' + data)

function getLocalVersion() {
    const file = join(path, 'package.json')
    return JSON.parse(readFileSync(file)).version;
}

async function getRemoteVersion() {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`)
    if (response && response.ok) {
        const json = await response.json()
        return json.tag_name.replace('v', '')
    } else return undefined
}

const checkForUpdates = async () => {
    const localVersion = getLocalVersion().split('.')
    const remoteVersion = (await getRemoteVersion(repository)).split('.')
    for (let i = 0, j = Math.min(localVersion.length, remoteVersion.length); i <= j; i += 1) {
        const localVersionPart = parseInt(localVersion.shift())
        const remoteVersionPart = parseInt(remoteVersion.shift())
        if (remoteVersionPart > localVersionPart) return true
        if (remoteVersionPart < localVersionPart) return false
    }
    return remoteVersion.length > 0
}

if (!isMainThread) {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`)
    if (response && response.ok) {
        const json = await response.json()
        const dir = join(getDirectory(), 'updates')
        if (!existsSync(dir)) mkdirSync(dir, {recursive: true})
        if (platform() == 'win32') {
            log('Downloading update...')
            spawnSync('curl', ['-L', json.assets[0].browser_download_url, '-o', join(dir, json.assets[0].name)])
            log('Successfully downloaded update')
            log('Installing update...')
            execFile(join(dir, json.assets[0].name), {shell: true}).unref()
            exit(0)
        }
    } else return undefined
}

const update = async () => new Worker(resolve(join(__dirname, 'updater.js')))

module.exports = {checkForUpdates, update}