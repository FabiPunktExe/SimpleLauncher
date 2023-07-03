const { join } = require("path")
const { downloadFilesAsync } = require("./downloader")
const { getDirectory } = require("../util")

const log = (...data) => console.log('[Mods Download] ' + data)

const downloadMods = (version, callback) => {
    const dir = join(getDirectory(), 'versions', version.id, 'mods')
    const mods = version.mods.map(mod => [mod, join(dir, mod.split('/')[mod.split('/').length - 1])])
    downloadFilesAsync(mods, undefined, log, callback)
}

module.exports = {downloadMods}