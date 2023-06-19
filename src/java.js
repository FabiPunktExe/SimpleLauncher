const { platform } = require("os")
const { runSync, getDirectory } = require("./util")
const { join } = require("path")
const { mkdirSync, existsSync, rmSync, writeFile, writeFileSync } = require("fs")

const log = (...data) => console.log('[Java Download] ' + data)

const getJavaVersion = () => {
    const output = runSync('java', '-version').output
    if (output) return output.toString().split('\"')[1]
    else return undefined
}

async function getJavaDownloadsUrl(version) {
    const response = await fetch('https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json', {timeout: 5000}).catch(error => {
        log('Couldn\'t fetch Java download URL. Trying again in 5 seconds...')
        getJavaDownloadsUrl(version, callback)
    })
    if (response && response.ok) {
        const json = await response.json()
        if (platform() == 'win32') return json['windows-x64'][version][0].manifest.url
        else if (platform() == 'linux') return json['linux'][version][0].manifest.url
        else return undefined
    } else return undefined
}

async function getJavaDownloads(url) {
    const response = await fetch(url, {timeout: 5000}).catch(error => {
        log('Couldn\'t fetch Java files. Trying again in 5 seconds...')
        getJavaDownloads(url, callback)
    })
    if (response && response.ok) {
        const json = await response.json()
        return json ? json.files : undefined
    } else return undefined
}

async function downloadNext(dir, downloads, files, filecount) {
    const file = files[0]
    const data = downloads[file]
    if (data.type == 'directory') {
        mkdirSync(join(dir, file), {recursive: true})
        files.shift()
        log(`Successfully created directory ${file} (${files.length}/${filecount} remaining)`)
        if (files.length == 0) return true
        else return await downloadNext(dir, downloads, files, filecount, callback)
    } else if ('downloads' in data && 'raw' in data.downloads) {
        log(`Downloading ${file}...`)
        try {
            const response = await fetch(data.downloads.raw.url, {timeout: 5000})
            if (response && response.ok) {
                const text = await response.text()
                writeFileSync(join(dir, file), text)
                files.shift()
                log(`Successfully downloaded ${file} (${files.length}/${filecount} remaining)`)
                if (files.length == 0) return true
                else return await downloadNext(dir, downloads, files, filecount)
            }
        } catch (e) {
            log(`Couldn't download ${file}; Trying again in 5 seconds... (${files.length}/${filecount} remaining)`)
            setTimeout(() => downloadNext(dir, downloads, files, filecount), 5000)
        }
    } else {
        files.shift()
        log(`Cannot download ${file} (${files.length}/${filecount} remaining)`)
        if (files.length == 0) return true
        else return await downloadNext(dir, downloads, files, filecount, callback)
    }
}

const downloadJava = async (version = 'java-runtime-gamma') => {
    const dir = join(getDirectory(), 'java', version)
    if (existsSync(dir)) {
        try {
            rmSync(dir, {recursive: true, force: true})
        } catch (e) {return false}
    }
    if (!existsSync(join(getDirectory(), 'java'))) mkdirSync(join(getDirectory(), 'java'))
    mkdirSync(dir, {recursive: true})
    const url = await getJavaDownloadsUrl(version)
    if (url) {
        const downloads = await getJavaDownloads(url)
        if (downloads) {
            const files = Object.keys(downloads)
            const filecount = files.length
            return await downloadNext(dir, downloads, files, filecount)
        } else return false
    } else  return false
}

module.exports = {getJavaVersion, downloadJava}