const { join } = require("path")
const { downloadFiles } = require("./downloader")
const { getMinecraftDir } = require("../util")
const { readFileSync } = require("fs")

const resourceUrl = 'https://resources.download.minecraft.net'

const log = (...data) => console.log('[Assets Download] ' + data)

const downloadAssets = async meta => {
    const dir = join(getMinecraftDir(), 'assets')
    const indexFile = join(dir, 'indexes', `${meta.assetIndex.id}.json`)
    if (!downloadFiles([[meta.assetIndex.url, indexFile]], undefined, log)) return false
    const index = JSON.parse(readFileSync(indexFile))
    const objects = Object.values(index.objects).map(object => {
        const hash = object.hash
        const subhash = hash.substring(0, 2)
        return [`${resourceUrl}/${subhash}/${hash}`, join(dir, 'objects', subhash, hash)]
    })
    return await downloadFiles(objects, undefined, log)
}

module.exports = {downloadAssets}