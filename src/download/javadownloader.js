const { platform } = require("os")
const { getDirectory } = require("../util")
const { join } = require("path")
const { downloadFiles } = require("./downloader")

const javaUrl = 'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'

const log = (...data) => console.log('[Java Download] ' + data)

const getJavaPath = (version = 'java-runtime-gamma') => {
    return join(getDirectory(), 'java', version)
}

async function getJavaDownloadsUrl(version) {
    try {
        const response = await fetch(javaUrl, {timeout: 5000})
        if (response && response.ok) {
            const json = await response.json()
            if (platform() == 'win32') return json['windows-x64'][version][0].manifest.url
            else if (platform() == 'linux') return json['linux'][version][0].manifest.url
            else return undefined
        } else return undefined
    } catch(error) {
        log('Couldn\'t fetch Java download URL. Trying again in 5 seconds...')
        return await getJavaDownloadsUrl(version)
    }
}

async function getJavaDownloads(url) {
    try {
        const response = await fetch(url, {timeout: 5000})
        if (response && response.ok) {
            const json = await response.json()
            return Object.entries(json.files).filter(download => download[1].type == 'file')
        } else return undefined
    } catch (error) {
        log('Couldn\'t fetch Java files. Trying again in 5 seconds...\n' + error)
        return await getJavaDownloads(url)
    }
}

const downloadJava = async (version = 'java-runtime-gamma') => {
    const dir = join(getDirectory(), 'java', version)
    const url = await getJavaDownloadsUrl(version)
    if (url) {
        var downloads = await getJavaDownloads(url)
        downloads = downloads.map(download => [download[1].downloads.raw.url, join(dir, download[0])])
        if (downloads) return await downloadFiles(downloads, undefined, log)
        else return false
    } else  return false
}

module.exports = {getJavaPath, downloadJava}