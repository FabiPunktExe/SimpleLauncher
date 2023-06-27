const { join } = require("path")
const { downloadFiles } = require("./downloader")
const { getMinecraftDir } = require("../util")

const log = (...data) => console.log('[Library Download] ' + data)

const downloadLibraries = async meta => {
    const dir = join(getMinecraftDir(), 'libraries')
    const libraries = meta.libraries.map(library => [library.downloads.artifact.url, join(dir, library.downloads.artifact.path)])
    return await downloadFiles(libraries, undefined, log)
}

module.exports = {downloadLibraries}