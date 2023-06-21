const { existsSync } = require("original-fs")
const { getDirectory, runSync, getPath } = require("./util")
const { join, dirname } = require("path")
const { spawnSync, spawn, } = require("child_process")
const { mkdirSync, readFileSync, statSync, rm, rmSync, cp, cpSync, readdirSync } = require("fs")
const { homedir, platform } = require("os")
const { downloadJava, getJavaVersion } = require("./java")
const { arch, env, stdout } = require("process")
const { refreshTokens } = require("./auth")

const versionsManifestUrl = 'https://launchermeta.mojang.com/mc/game/version_manifest.json'
const resourceUrl = 'https://resources.download.minecraft.net'
const versionsUrl = 'https://simpeclient.github.io/SimpleWebsite/versions.json'
var memory = 2048

const log = (...data) => console.log('[Minecraft Download] ' + data)

const getSimpleClientVersions = callback => {
    fetch(versionsUrl).catch(console.log).then(response => {
        if (response && response.ok) {
            response.json().then(callback)
        }
    })
}

const getMinecraftDir = () => {
    if (platform() == 'win32') return join(process.env.APPDATA, '.minecraft')
    else if (platform() == 'linux')  return join(homedir(), '.minecraft')
    else return undefined
}

function checkRule(rule) {
    if ('os' in rule && 'name' in rule.os) {
        const os = platform() == 'win32' ? 'windows' : platform() == 'linux' ? 'linux' : undefined
        if (os == rule.os.name) return rule.action == 'allow'
        else return rule.action == 'disallow'
    } else if ('os' in rule && 'arch' in rule.os) {
        if (arch == rule.os.arch) return rule.action == 'allow'
        else return rule.action == 'disallow'
    } else if ('features' in rule && 'is_demo_user' in rule.features) {
        return rule.action == 'disallow'
    } else if ('features' in rule && 'has_custom_resolution' in rule.features) {
        return rule.action == 'disallow'
    } else if ('features' in rule && 'has_quick_plays_support' in rule.features) {
        return rule.action == 'disallow'
    } else if ('features' in rule && 'is_quick_play_singleplayer' in rule.features) {
        return rule.action == 'disallow'
    } else if ('features' in rule && 'is_quick_play_multiplayer' in rule.features) {
        return rule.action == 'disallow'
    } else if ('features' in rule && 'is_quick_play_realms' in rule.features) {
        return rule.action == 'disallow'
    }
}

async function downloadLibraries(versionMeta) {
    const dir = join(getMinecraftDir(), 'libraries')
    versionMeta.libraries/*.filter(library => !library.rules || library.rules.every(checkRule))*/.forEach(library => {
        if (!existsSync(join(dir, library.downloads.artifact.path))) {
            log(`Downloading library ${library.name}...`)
            const libraryDir = dirname(join(dir, library.downloads.artifact.path))
            if (!existsSync(libraryDir)) mkdirSync(libraryDir)
            spawnSync('curl', ['-L', library.downloads.artifact.url, '-o', join(dir, library.downloads.artifact.path)])
            log(`Successfully downloaded library ${library.name}...`)
        }
    })
}

async function downloadAssets(versionMeta) {
    const assetsDir = join(getMinecraftDir(), 'assets')
    const indexesDir = join(assetsDir, 'indexes')
    if (!existsSync(indexesDir)) mkdirSync(indexesDir, {recursive: true})
    const indexFile = join(indexesDir, `${versionMeta.assetIndex.id}.json`)
    if (!existsSync(indexFile)) {
        log(`Downloading ${versionMeta.assetIndex.id}.json...`)
        spawnSync('curl', ['-L', versionMeta.assetIndex.url, '-o', indexFile])
        log(`Successfully downloaded ${versionMeta.assetIndex.id}.json...`)
    }
    const index = JSON.parse(readFileSync(indexFile))
    const objectsDir = join(assetsDir, 'objects')
    for (let [name, object] of Object.entries(index.objects)) {
        const hash = object.hash
        const subhash = hash.substring(0, 2)
        if (!existsSync(join(objectsDir, subhash, hash))) {
            if (!existsSync(join(objectsDir, subhash))) mkdirSync(join(objectsDir, subhash))
            log(`Downloading asset ${name}...`)
            spawnSync('curl', ['-L', `${resourceUrl}/${subhash}/${hash}`, '-o', join(objectsDir, subhash, hash)])
            log(`Successfully downloaded asset ${name}...`)
        }
    }
}

async function downloadMods(version) {
    const dir = join(getDirectory(), 'versions', version.id, 'mods')
    if (!existsSync(dir)) mkdirSync(dir, {recursive: true})
    version.mods.forEach(mod => {
        const fileName = mod.split('/')[mod.split('/').length - 1]
        if (!existsSync(join(dir, fileName))) {
            log(`Downloading mod ${fileName}...`)
            spawnSync('curl', ['-L', mod, '-o', join(dir, fileName)])
            log(`Successfully downloaded mod ${fileName}...`)
        }
    })
}

async function downloadVersion(version, dir, statusCallback) {
    statusCallback('download_starting')
    if (!existsSync(dir)) mkdirSync(dir, {recursive: true})
    const fabricVersionDir = join(getMinecraftDir(), 'versions', `fabric-loader-${version.fabric_version}-${version.minecraft_version}`)
    const minecraftVersionDir = join(getMinecraftDir(), 'versions', version.minecraft_version)
    const versionsManifestResponse = await fetch(versionsManifestUrl)
    if (!versionsManifestResponse || !versionsManifestResponse.ok) {statusCallback('error'); return}
    const versionsManifest = await versionsManifestResponse.json()
    const versionManifest = versionsManifest.versions.find(ver => ver.id == version.minecraft_version)
    if (!existsSync(minecraftVersionDir)) {
        mkdirSync(minecraftVersionDir)
        log(`Successfully created directory ${version.minecraft_version}`)
    }
    if (!existsSync(join(minecraftVersionDir, `${version.minecraft_version}.json`))) {
        log(`Downloading ${version.minecraft_version}/${version.minecraft_version}.json`)
        spawnSync('curl', ['-L', versionManifest.url, '-o', join(minecraftVersionDir, `${version.minecraft_version}.json`)])
        log(`Successfully downloaded ${version.minecraft_version}/${version.minecraft_version}.json`)
    }
    const minecraftVersionMeta = JSON.parse(readFileSync(join(minecraftVersionDir, `${version.minecraft_version}.json`)))
    if (!getJavaVersion() || parseInt(getJavaVersion().split('.')[0]) < 17) {
        statusCallback('downloading_java_starting')
        if (downloadJava(minecraftVersionMeta.javaVersion.component)) {
            statusCallback('downloading_java_done')
        } else {
            statusCallback('error')
            return
        }
    }
    if (!existsSync(fabricVersionDir)) {
        const fabricInstallerResponse = await fetch('https://meta.fabricmc.net/v2/versions/installer')
        if (!fabricInstallerResponse) {statusCallback('error'); return}
        const fabricInstallerJson = await fabricInstallerResponse.json()
        const fabricInstallerFile = join(dir, `fabric-installer-${fabricInstallerJson[0].version}.jar`)
        log('Downloading Fabric Installer...')
        spawnSync('curl', ['-L', fabricInstallerJson[0].url, '-o', fabricInstallerFile])
        log('Successfully downloaded Fabric Installer')
        log('Executing Fabric Installer...')
        runSync('java',
                '-jar', fabricInstallerFile,
                'client',
                '-dir', getMinecraftDir(),
                '-mcversion', version.minecraft_version,
                '-loader', version.fabric_version,
                '-noprofile')
        log('Successfully installed Fabric Loader')
    }
    const fabric = `fabric-loader-${version.fabric_version}-${version.minecraft_version}`
    if (!existsSync(join(fabricVersionDir, `${fabric}.jar`)) || statSync(join(fabricVersionDir, `${fabric}.jar`)).size == 0) {
        log(`Downloading ${fabric}/${fabric}.jar...`)
        spawnSync('curl', ['-L', minecraftVersionMeta.downloads.client.url, '-o', join(fabricVersionDir, `${fabric}.jar`)])
        log(`Successfully downloaded ${fabric}/${fabric}.jar`)
    }
    statusCallback('downloading_libraries_starting')
    await downloadLibraries(minecraftVersionMeta)
    statusCallback('downloading_libraries_done')
    statusCallback('downloading_assets_starting')
    await downloadAssets(minecraftVersionMeta)
    statusCallback('downloading_assets_done')
    statusCallback('downloading_mods_starting')
    await downloadMods(version)
    statusCallback('downloading_mods_done')
    statusCallback('download_done')
}

function insertValues(args, values) {
    return args.map(arg => {
        for (let [name, value] of Object.entries(values)) {
            arg = arg.replace(`\${${name}}`, value)
        }
        return arg
    })
}

const launch = async (version, account, statusCallback) => {
    statusCallback('starting')
    const dir = join(getDirectory(), 'versions', version.id)
    if (!existsSync(dir)) await downloadVersion(version, dir, statusCallback)
    statusCallback('authenticating')
    await refreshTokens(account)
    const accessToken = account.minecraft_access_tokens.find(token => token.expiration > new Date().getTime()).token
    statusCallback('launching')
    const versionsDir = join(getMinecraftDir(), 'versions')
    const versionDir = join(versionsDir, version.minecraft_version)
    const fabricDir = join(versionsDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}`)
    const meta = JSON.parse(readFileSync(join(versionDir, `${version.minecraft_version}.json`)))
    const fabricMeta = JSON.parse(readFileSync(join(fabricDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}.json`)))
    meta.mainClass = fabricMeta.mainClass
    meta.arguments.jvm = meta.arguments.jvm.concat(fabricMeta.arguments.jvm)
    meta.arguments.game = meta.arguments.game.concat(fabricMeta.arguments.game)
    const path = getPath()
    const nativesDirectory = join(getMinecraftDir(), 'natives', version.minecraft_version)
    const separator = platform() == 'win32' ? ';' : platform() == 'linux' ? ':' : undefined
    const libraryDir = join(getMinecraftDir(), 'libraries')
    const libraries = meta.libraries.map(library => {
        return join(libraryDir, library.downloads.artifact.path)
    }).concat(fabricMeta.libraries.map(library => {
        return join(libraryDir, library.name.split(':')[0].replace('.', '/').replace('.', '/'), library.name.split(':')[1], library.name.split(':')[2], `${library.name.split(':')[1]}-${library.name.split(':')[2]}.jar`)
    })).join(separator)
    const jar = join(fabricDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}.jar`)
    const classpath = libraries + separator + jar
    const values = {
        natives_directory: nativesDirectory,
        auth_player_name: account.name,
        version_name: meta.id,
        game_directory: getMinecraftDir(),
        assets_root: join(getMinecraftDir(), 'assets'),
        assets_index_name: meta.assetIndex.id,
        auth_uuid: account.uuid,
        auth_access_token: accessToken,
        clientid: '',
        auth_xuid: '',
        user_type: 'msa',
        version_type: meta.type,
        launcher_name: 'SimpleLauncher',
        launcher_version: env.npm_package_version,
        classpath: classpath
    }
    var jvmArguments = [
        `-Xmx${memory}M`,
        '-Dlog4j2.formatMsgNoLookups=true',
        '-Dfabric.addMods=' + readdirSync(join(dir, 'mods')).map(mod => join(dir, 'mods', mod)).join(separator)
    ]
    meta.arguments.jvm.filter(arg => !arg.rules || arg.rules.every(checkRule)).forEach(arg => {
        if (arg.value) {
            if (Array.isArray(arg.value)) for (value of arg.value) jvmArguments.push(value)
            else jvmArguments.push(arg.value)
        } else jvmArguments.push(arg)
    })
    var arguments = []
    arguments = arguments.concat(jvmArguments)
    arguments.push(meta.mainClass)
    meta.arguments.game.filter(arg => !arg.rules || arg.rules.every(checkRule)).forEach(arg => {
        if (arg.value) {
            if (Array.isArray(arg.value)) for (value of arg.value) jvmArguments.push(value)
            else arguments.push(arg.value)
        } else arguments.push(arg)
    })
    if (existsSync(join(getDirectory(), 'tmpmods'))) rmSync(join(getDirectory(), 'tmpmods'), {recursive: true, force: true})
    cpSync(join(getMinecraftDir(), 'mods'), join(getDirectory(), 'tmpmods'), {recursive: true, force: true})
    rmSync(join(getMinecraftDir(), 'mods'), {recursive: true, force: true})
    console.log('[Minecraft] Launching...')
    const process = spawn('java', insertValues(arguments, values), {
        cwd: getMinecraftDir(),
        env: {PATH: path},
        detached: true
    })
    process.stdout.on('data', data => {
        if (data.toString().includes('Loading ') &&
            data.toString().includes(' mods:')) {
            cpSync(join(getDirectory(), 'tmpmods'), join(getMinecraftDir(), 'mods'), {recursive: true, force: true})
            rm(join(getDirectory(), 'tmpmods'), {recursive: true, force: true}, () => {})
        }
    }).pipe(stdout)
    process.unref()
    statusCallback('done')
}

module.exports = {launch, getSimpleClientVersions}