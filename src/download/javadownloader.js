const { platform } = require("os")
const { getDirectory } = require("../util")
const { join } = require("path")
const { downloadFiles, downloadFilesAsync } = require("./downloader")

const javaUrl = 'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'

const log = (...data) => console.log('[Java Download] ' + data)

const getJavaPath = (version = 'java-runtime-gamma') => {
    return join(getDirectory(), 'java', version)
}

function getJavaDownloadsUrl(version, callback) {
    fetch(javaUrl, {timeout: 5000}).then(response => {
        if (response && response.ok) {
            response.json().then(json => {
                if (platform() == 'win32') callback(json['windows-x64'][version][0].manifest.url)
                else if (platform() == 'linux') callback(json['linux'][version][0].manifest.url)
                else callback(undefined)
            })
        } else callback(undefined)
    }).catch(error => {
        log('Couldn\'t fetch Java download URL. Trying again in 5 seconds...')
        setTimeout(5000, () => getJavaDownloadsUrl(version, callback))
    })
}

function getJavaDownloads(url, callback) {
    fetch(url, {timeout: 5000}).then(response => {
        if (response && response.ok) {
            response.json().then(json => callback(Object.entries(json.files).filter(download => download[1].type == 'file')))
        } else return undefined
    }).catch(error => {
        log('Couldn\'t fetch Java files. Trying again in 5 seconds...\n' + error)
        setTimeout(5000, () => getJavaDownloads(url, callback))
    })
}

const downloadJava = (version, callback) => {
    const dir = join(getDirectory(), 'java', version)
    getJavaDownloadsUrl(version, url => {
        if (url) {
            getJavaDownloads(url, downloads => {
                console.log(downloads)
                downloads = downloads.map(download => [download[1].downloads.raw.url, join(dir, download[0])])
                downloadFilesAsync(downloads, undefined, log, callback)
            })
        } else callback(false)
    })
}

module.exports = {getJavaPath, downloadJava}