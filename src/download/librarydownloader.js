const { join } = require("path")
const { downloadFilesAsync } = require("./downloader")
const { getMinecraftDir } = require("../util")
const { platform } = require("os")
const { getJavaPath } = require("./javadownloader")
const { spawn } = require("child_process")
const { env, stdout, stderr } = require("process")
const { existsSync, mkdirSync } = require("fs")

const log = (...data) => console.log('[Library Download] ' + data)

const collectLibraries = (meta, checkRule) => {
    const dir = join(getMinecraftDir(), 'libraries')
    const allowedLibraries = meta.libraries.filter(library => library.rules ? library.rules.every(checkRule) : true)
    const libraries = []
    allowedLibraries.forEach(library => {
        if (library.downloads.classifiers) {
            const classifier = library.natives[platform() == 'win32' ? 'windows' : 'linux']
            const download = library.downloads.classifiers[classifier]
            libraries.push([download.url, join(dir, download.path)])
        } else if (library.downloads.artifact) libraries.push([library.downloads.artifact.url, join(dir, library.downloads.artifact.path)])
    })
    return libraries
}

const collectNatives = (meta, checkRule) => {
    const dir = join(getMinecraftDir(), 'libraries')
    const allowedLibraries = meta.libraries.filter(library => library.rules ? library.rules.every(checkRule) : true)
    const natives = []
    allowedLibraries.forEach(library => {
        if (library.downloads.classifiers) {
            const classifier = library.natives[platform() == 'win32' ? 'windows' : 'linux']
            const download = library.downloads.classifiers[classifier]
            natives.push(join(dir, download.path))
        }
    })
    return natives
}

const extractNatives = (meta, natives, nativesDirectory, separator, callback) => {
    if (!existsSync(nativesDirectory)) mkdirSync(nativesDirectory, {recursive: true})
    if (natives.length == 0) callback(true)
    else {
        const native = natives.shift()
        spawn(join(getJavaPath(meta.javaVersion.component), 'bin', 'jar'), ['xf', native], {
            cwd: nativesDirectory,
            env: {PATH: env.PATH + separator + getJavaPath(meta.javaVersion.component)}
        }).on('exit', status => {
            if (status == 0) extractNatives(meta, natives, nativesDirectory, separator, callback)
            else callback(false)
        })
    }
}

module.exports = {collectLibraries, collectNatives, extractNatives}