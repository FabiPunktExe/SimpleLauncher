const { join } = require("path")
const { downloadFiles } = require("./downloader")
const { getDirectory } = require("../util")

const log = (...data) => console.log('[Mods Download] ' + data)

const downloadMods = async version => {
    const dir = join(getDirectory(), 'versions', version.id, 'mods')
    const mods = version.mods.map(mod => [mod, join(dir, mod.split('/')[mod.split('/').length - 1])])
    return await downloadFiles(mods, undefined, log)
}

module.exports = {downloadMods}