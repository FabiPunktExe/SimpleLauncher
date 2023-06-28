const { getDirectory, getMinecraftDir } = require("./util")
const { join } = require("path")
const { spawn, } = require("child_process")
const { readFileSync, rmSync, cpSync, readdirSync } = require("fs")
const { platform } = require("os")
const { arch, env, stdout } = require("process")
const { refreshTokens } = require("./auth")
const { downloadMeta } = require("./download/metadownloader")
const { downloadJava, getJavaPath } = require("./download/javadownloader")
const { downloadFabric } = require("./download/fabricdownloader")
const { downloadLibraries } = require("./download/librarydownloader")
const { downloadAssets } = require("./download/assetdownloader")
const { downloadMods } = require("./download/moddownloader")

const versionsUrl = 'https://simpeclient.github.io/SimpleWebsite/versions.json'
var memory = 2048

const log = (...data) => console.log('[Minecraft] ' + data)

const getSimpleClientVersions = callback => {
    fetch(versionsUrl).catch(console.log).then(response => {
        if (response && response.ok) {
            response.json().then(callback)
        }
    })
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
    const dir = getMinecraftDir()
    statusCallback('downloading')
    statusCallback('downloading_meta')
    if (!await downloadMeta(version)) {statusCallback('error'); return}
    const versionsDir = join(dir, 'versions')
    const metaDir = join(versionsDir, version.minecraft_version)
    const meta = JSON.parse(readFileSync(join(metaDir, `${version.minecraft_version}.json`)))
    statusCallback('downloading_java')
    if (!await downloadJava(meta.javaVersion.component)) {statusCallback('error'); return}
    statusCallback('downloading_fabric')
    if (!await downloadFabric(version, meta)) {statusCallback('error'); return}
    const fabricDir = join(versionsDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}`)
    const fabricMeta = JSON.parse(readFileSync(join(fabricDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}.json`)))
    statusCallback('downloading_libraries')
    if (!await downloadLibraries(meta)) {statusCallback('error'); return}
    statusCallback('downloading_assets')
    if (!await downloadAssets(meta)) {statusCallback('error'); return}
    statusCallback('downloading_mods')
    if (!await downloadMods(version)) {statusCallback('error'); return}
    statusCallback('authenticating')
    if (!await refreshTokens(account)) {statusCallback('error'); return}
    const accessToken = account.minecraft_access_tokens.find(token => token.expiration > new Date().getTime()).token
    statusCallback('launching')
    meta.mainClass = fabricMeta.mainClass
    meta.arguments.jvm = meta.arguments.jvm.concat(fabricMeta.arguments.jvm)
    meta.arguments.game = meta.arguments.game.concat(fabricMeta.arguments.game)
    const separator = platform() == 'win32' ? ';' : platform() == 'linux' ? ':' : undefined
    const nativesDirectory = join(dir, 'natives', version.minecraft_version)
    const libraryDir = join(dir, 'libraries')
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
        game_directory: dir,
        assets_root: join(dir, 'assets'),
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
    const modsDir = join(getDirectory(), 'versions', version.id, 'mods')
    var jvmArguments = [
        `-Xmx${memory}M`,
        '-Dlog4j2.formatMsgNoLookups=true',
        '-Dfabric.addMods=' + readdirSync(modsDir).map(mod => join(modsDir, mod)).join(separator)
    ]
    console.log(jvmArguments)
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
    rmSync(join(getDirectory(), 'tmpmods'), {recursive: true, force: true})
    cpSync(join(dir, 'mods'), join(getDirectory(), 'tmpmods'), {recursive: true, force: true})
    rmSync(join(dir, 'mods'), {recursive: true, force: true})
    log('Launching...')
    const process = spawn(join(getJavaPath(meta.javaVersion.component), 'bin', 'javaw'), insertValues(arguments, values), {
        cwd: dir,
        env: {PATH: env.PATH + separator + getJavaPath(meta.javaVersion.component)},
        detached: true
    })
    process.stdout.on('data', data => {
        if (data.toString().includes('Loading ') && data.toString().includes(' mods:')) {
            cpSync(join(getDirectory(), 'tmpmods'), join(dir, 'mods'), {recursive: true, force: true})
        }
    }).pipe(stdout)
    process.unref()
    statusCallback('done')
}

module.exports = {launch, getSimpleClientVersions}