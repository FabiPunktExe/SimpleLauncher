const { platform } = require("os")
const { runSync, getDirectory } = require("./util")
const { join } = require("path")
const { mkdirSync, existsSync, rmSync, rm, writeFile } = require("fs")
const { Readable } = require("stream")
const { decompress } = require("lzma")

const getJavaVersion = () => {
    const output = runSync('java', '-version').output
    if (output) return output.toString().split('\"')[1]
    else return undefined
}

const log = (...data) => console.log('[Java Download] ' + data)

function getJavaDownloadsUrl(version, callback) {
    fetch('https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json', {timeout: 5000}).catch(error => {
        log('Couldn\'t fetch Java download URL. Trying again in 5 seconds...')
        getJavaDownloadsUrl(version, callback)
    }).then(response => {
        if (response && response.ok) {
            response.json().then(json => {
                if (platform() == 'win32') callback(json['windows-x64'][version][0].manifest.url)
                if (platform() == 'linux') callback(json['linux'][version][0].manifest.url)
            })
        }
    })
}

function getJavaDownloads(url, callback) {
    fetch(url, {timeout: 5000}).catch(error => {
        log('Couldn\'t fetch Java files. Trying again in 5 seconds...')
        getJavaDownloads(url, callback)
    }).then(response => {
        if (response && response.ok) response.json().then(json => callback(json.files))
        else callback(undefined)
    })
}

function downloadNext(dir, downloads, files, filecount, callback) {
    const file = files[0]
    const data = downloads[file]
    if (data.type == 'directory') {
        mkdirSync(join(dir, file), {recursive: true})
        files.shift()
        log('Successfully created directory ' + file + ' (' + files.length + '/' + filecount + ' remaining)')
        if (files.length == 0) callback()
        else downloadNext(dir, downloads, files, filecount, callback)
    } else if ('downloads' in data && 'raw' in data.downloads) {
        log('Downloading ' + file + '...')
        fetch(data.downloads.raw.url, {timeout: 5000}).catch(error => {
            log('Couldn\'t download ' + file + '; Trying again in 5 seconds... (' + files.length + '/' + filecount + ' remaining)')
            setTimeout(() => downloadNext(dir, downloads, files, filecount, callback), 5000)
        }).then(response => {
            if (response && response.ok) {
                response.text().then(text => {
                    writeFile(join(dir, file), text, () => {
                        files.shift()
                        log('Successfully downloaded ' + file + ' (' + files.length + '/' + filecount + ' remaining)')
                        if (files.length == 0) callback()
                        else downloadNext(dir, downloads, files, filecount, callback)
                    })
                })
            }
        })
    } else {
        files.shift()
        log('Cannot downloaded ' + file + ' (' + files.length + '/' + filecount + ' remaining)')
        if (files.length == 0) callback()
        else downloadNext(dir, downloads, files, filecount, callback)
    }
}

const downloadJava = (statusCallback, version = 'java-runtime-gamma') => {
    statusCallback('downloading_java')
    const dir = join(getDirectory(), 'java', version)
    if (existsSync(dir)) {
        try {
            rmSync(dir, {recursive: true, force: true})
        } catch (e) {
            statusCallback('error')
            return
        }
    }
    if (!existsSync(join(getDirectory(), 'java'))) mkdirSync(join(getDirectory(), 'java'))
    mkdirSync(dir, {recursive: true})
    getJavaDownloadsUrl(version, url => {
        if (url) {
            getJavaDownloads(url, downloads => {
                if (downloads) {
                    const files = Object.keys(downloads)
                    const filecount = files.length
                    downloadNext(dir, downloads, files, filecount, () => statusCallback('done'))
                } else statusCallback('error')
            })
        } else statusCallback('error')
    })
}

module.exports = {getJavaVersion, downloadJava}