const { join } = require("path")
const { existsSync, statSync } = require("fs")
const { downloadFiles } = require("./downloader")
const { spawnSync } = require("child_process")
const { getDirectory, getMinecraftDir } = require("../util")
const { getJavaPath } = require("./javadownloader")

const log = (...data) => console.log('[Fabric Download] ' + data)

const downloadFabric = async (version, meta) => {
    const fabric = `fabric-loader-${version.fabric_version}-${version.minecraft_version}`
    const fabricDir = join(getMinecraftDir(), 'versions', fabric)
    if (!existsSync(join(fabricDir, `${fabric}.json`))) {
        const fabricInstallerResponse = await fetch('https://meta.fabricmc.net/v2/versions/installer')
        if (!fabricInstallerResponse) return false
        const fabricInstallerJson = await fabricInstallerResponse.json()
        const fabricInstallerFile = join(getDirectory(), 'versions', version.id, `fabric-installer-${fabricInstallerJson[0].version}.jar`)
        if (!downloadFiles([[fabricInstallerJson[0].url, fabricInstallerFile]], undefined, log)) return false
        log('Executing Fabric installer...')
        const args = ['-jar', fabricInstallerFile, 'client', '-dir', getMinecraftDir(), '-mcversion', version.minecraft_version, '-loader', version.fabric_version, '-noprofile']
        if (spawnSync(join(getJavaPath(meta.javaVersion.component), 'bin', 'javaw'), args, {
            cwd: getDirectory(),
            env: {PATH: env.PATH + separator + getJavaPath(meta.javaVersion.component)}
        }).signal != 0) return false
        log('Successfully installed Fabric Loader')
    }
    if (!existsSync(join(fabricDir, `${fabric}.jar`)) || statSync(join(fabricDir, `${fabric}.jar`)).size == 0) {
        return await downloadFiles([[meta.downloads.client.url, join(fabricDir, `${fabric}.jar`)]], undefined, log)
    } else return true
}

module.exports = {downloadFabric}