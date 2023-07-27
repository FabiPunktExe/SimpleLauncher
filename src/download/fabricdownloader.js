const { join } = require("path")
const { existsSync, statSync, rmSync } = require("fs")
const { downloadFilesAsync } = require("./downloader")
const { spawn } = require("child_process")
const { getDirectory, getMinecraftDir } = require("../util")
const { getJavaPath } = require("./javadownloader")

const log = (...data) => console.log('[Fabric Download] ' + data)

function downloadJar(version, meta, callback) {
    const fabric = `fabric-loader-${version.fabric_version}-${version.minecraft_version}`
    const jar = join(getMinecraftDir(), 'versions', fabric, `${fabric}.jar`)
    if (existsSync(jar) && statSync(jar).size == 0) rmSync(jar)
    if (!existsSync(jar)) downloadFilesAsync([[meta.downloads.client.url, jar]], undefined, log, callback)
    else callback(true)
}

const downloadFabric = (version, meta, callback) => {
    const fabric = `fabric-loader-${version.fabric_version}-${version.minecraft_version}`
    const fabricDir = join(getMinecraftDir(), 'versions', fabric)
    if (existsSync(join(fabricDir, `${fabric}.json`))) downloadJar(version, meta, callback)
    else {
        var fabricInstallerUrl = 'https://meta.fabricmc.net/v2/versions/installer'
        if (version.overrides && version.overrides.fabric_installer_url) fabricInstallerUrl = version.overrides.fabric_installer_url
        fetch(fabricInstallerUrl).then(fabricInstallerResponse => {
            if (fabricInstallerResponse) {
                fabricInstallerResponse.json().then(fabricInstallerJson => {
                    const fabricInstallerFile = join(getDirectory(), 'versions', version.id, `fabric-installer-${fabricInstallerJson[0].version}.jar`)
                    downloadFilesAsync([[fabricInstallerJson[0].url, fabricInstallerFile]], undefined, log, succes => {
                        if (succes) {
                            log('Executing Fabric installer...')
                            const args = ['-jar', fabricInstallerFile, 'client', '-dir', getMinecraftDir(), '-mcversion', version.minecraft_version, '-loader', version.fabric_version, '-noprofile']
                            spawn(join(getJavaPath(meta.javaVersion.component), 'bin', 'javaw'), args, {
                                cwd: getDirectory()
                            }).on('exit', (code, signal) => {
                                if (code == 0) {
                                    log('Successfully installed Fabric Loader')
                                    downloadJar(version, meta, callback)
                                } else callback(false)
                            })
                        } else callback(false)
                    })
                })
            } else callback(false)
        })
    }
}

module.exports = {downloadFabric}