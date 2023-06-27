const { join } = require("path")
const { downloadFiles } = require("./downloader")
const { getMinecraftDir } = require("../util")

const metaUrl = 'https://launchermeta.mojang.com/mc/game/version_manifest.json'

const log = (...data) => console.log('[Meta Download] ' + data)

const downloadMeta = async version => {
    const metaManifestResponse = await fetch(metaUrl)
    if (!metaManifestResponse || !metaManifestResponse.ok) return false
    const metaManifest = (await metaManifestResponse.json()).versions.find(ver => ver.id == version.minecraft_version)
    return await downloadFiles([[metaManifest.url, join(getMinecraftDir(), 'versions', version.minecraft_version, `${version.minecraft_version}.json`)]], undefined, log)
}

module.exports = {downloadMeta}