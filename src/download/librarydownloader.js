const { join } = require("path")
const { downloadFilesAsync } = require("./downloader")
const { getMinecraftDir } = require("../util")

const log = (...data) => console.log('[Library Download] ' + data)

const downloadLibraries = (meta, callback) => {
    const dir = join(getMinecraftDir(), 'libraries')
    const libraries = meta.libraries.map(library => [library.downloads.artifact.url, join(dir, library.downloads.artifact.path)])
    downloadFilesAsync(libraries, undefined, log, callback)
}

module.exports = {downloadLibraries}