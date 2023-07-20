const { join } = require("path")
const { downloadFilesAsync } = require("./downloader")
const { getDirectory } = require("../util")

const log = (...data) => console.log('[Mods Download] ' + data)

const downloadMods = (version, callback) => {
    const dir = join(getDirectory(), 'versions', version.id, 'mods')
    const mods = version.mods.map(mod => {
        if (typeof mod === 'string') return [mod, join(dir, mod.split('/')[mod.split('/').length - 1])]
        else return [mod.url, join(dir, mod.filename)]
    })
    downloadFilesAsync(mods, undefined, log, callback)
}

module.exports = {downloadMods}