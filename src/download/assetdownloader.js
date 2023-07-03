const { join } = require("path")
const {  downloadFilesAsync } = require("./downloader")
const { getMinecraftDir } = require("../util")
const { readFileSync } = require("fs")

const resourceUrl = 'https://resources.download.minecraft.net'

const log = (...data) => console.log('[Assets Download] ' + data)

const downloadAssets = (meta, callback) => {
    const dir = join(getMinecraftDir(), 'assets')
    const indexFile = join(dir, 'indexes', `${meta.assetIndex.id}.json`)
    downloadFilesAsync([[meta.assetIndex.url, indexFile]], undefined, log, success => {
        if (success) {
            const index = JSON.parse(readFileSync(indexFile))
            const objects = Object.values(index.objects).map(object => {
                const hash = object.hash
                const subhash = hash.substring(0, 2)
                return [`${resourceUrl}/${subhash}/${hash}`, join(dir, 'objects', subhash, hash)]
            })
            downloadFilesAsync(objects, undefined, log, callback)
        } else callback(false)
    })
}

module.exports = {downloadAssets}