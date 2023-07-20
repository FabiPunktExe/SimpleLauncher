const { getDirectory, getMinecraftDir } = require("./util")
const { join, sep } = require("path")
const { spawn, } = require("child_process")
const { readFileSync, rmSync, cpSync, readdirSync, existsSync } = require("fs")
const { platform } = require("os")
const { arch, env, stdout } = require("process")
const { downloadMeta } = require("./download/metadownloader")
const { downloadJava, getJavaPath } = require("./download/javadownloader")
const { downloadFabric } = require("./download/fabricdownloader")
const { collectLibraries, extractNatives, collectNatives } = require("./download/librarydownloader")
const { downloadAssets } = require("./download/assetdownloader")
const { downloadMods } = require("./download/moddownloader")
const os = require("os")
const { downloadFilesAsync } = require("./download/downloader")
const { pseudoRandomBytes } = require("crypto")

const versionsUrl = 'https://simpleclientdevelopment.github.io/SimpleWebsite/versions.json'
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
    } else return rule.action == 'allow'
}

function insertValues(args, values) {
    return args.map(arg => {
        for (let [name, value] of Object.entries(values)) {
            arg = arg.replace(`\${${name}}`, value)
        }
        return arg
    })
}

function replaceValues(meta, values) {
    for (let [name, value] of Object.entries(values)) meta = meta.replaceAll(`\${${name}}`, value)
    return meta
}

function getClasspath(version, fabricMeta, libraries) {
    const dir = getMinecraftDir()
    const versionsDir = join(dir, 'versions')
    const fabricDir = join(versionsDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}`)
    const jar = join(fabricDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}.jar`)
    const separator = platform() == 'win32' ? ';' : ':'
    const libraryDir = join(dir, 'libraries')
    const classpath = []
    libraries.forEach(library => classpath.push(library[1]))
    if (fabricMeta.libraries) {
        fabricMeta.libraries.forEach(library => {
            const pieces = library.name.split(':')
            classpath.push(join(libraryDir, pieces[0].replace('.', '/').replace('.', '/'), pieces[1], pieces[2], `${pieces[1]}-${pieces[2]}.jar`))
        })
    }
    classpath.push(jar)
    return classpath.join(separator)
}

function getJvmArguments(version, meta, fabricMeta) {
    const separator = platform() == 'win32' ? ';' : ':'
    const modsDir = join(getDirectory(), 'versions', version.id, 'mods')
    const arguments = [
        `-Xmx${memory}M`,
        '-Dlog4j2.formatMsgNoLookups=true',
        '-Dfabric.addMods=' + readdirSync(modsDir).map(mod => join(modsDir, mod)).join(separator)
    ]
    if (meta.arguments && meta.arguments.jvm) {
        meta.arguments.jvm.filter(arg => !arg.rules || arg.rules.every(checkRule)).forEach(arg => {
            if (arg.value) {
                if (Array.isArray(arg.value)) for (value of arg.value) arguments.push(value)
                else arguments.push(arg.value)
            } else arguments.push(arg)
        })
    }
    if (fabricMeta.arguments && fabricMeta.arguments.jvm) {
        fabricMeta.arguments.jvm.filter(arg => !arg.rules || arg.rules.every(checkRule)).forEach(arg => {
            if (arg.value) {
                if (Array.isArray(arg.value)) for (value of arg.value) arguments.push(value)
                else arguments.push(arg.value)
            } else arguments.push(arg)
        })
    }
    return arguments
}

function getGameArguments(meta, fabricMeta) {
    var arguments = []
    if (meta.arguments && meta.arguments.game) {
        meta.arguments.game.filter(arg => !arg.rules || arg.rules.every(checkRule)).forEach(arg => {
            if (arg.value) {
                if (Array.isArray(arg.value)) for (value of arg.value) arguments.push(value)
                else arguments.push(arg.value)
            } else arguments.push(arg)
        })
    }
    if (fabricMeta.arguments && fabricMeta.arguments.game) {
        fabricMeta.arguments.game.filter(arg => !arg.rules || arg.rules.every(checkRule)).forEach(arg => {
            if (arg.value) {
                if (Array.isArray(arg.value)) for (value of arg.value) arguments.push(value)
                else arguments.push(arg.value)
            } else arguments.push(arg)
        })
    }
    if (meta.minecraftArguments) arguments = arguments.concat(meta.minecraftArguments.split(' '))
    if (fabricMeta.minecraftArguments) arguments = arguments.concat(fabricMeta.minecraftArguments.split(' '))
    return arguments
}

function getArguments(version, meta, fabricMeta, libraries, account, accessToken) {
    const dir = getMinecraftDir()
    const nativesDirectory = join(dir, 'natives', version.minecraft_version)
    const classpath = getClasspath(version, fabricMeta, libraries)
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
        classpath: classpath,
        user_properties: '{}'
    }
    var arguments = getJvmArguments(version, meta, fabricMeta)
    if (!arguments.includes('-cp') &&
        !arguments.includes('-classpath') &&
        !arguments.includes('--class-path')) {
        arguments.push('-cp')
        arguments.push(classpath)
    }
    if (!arguments.includes('-Djava.library.path=${natives_directory}')) arguments.push('-Djava.library.path=${natives_directory}')
    arguments.push(fabricMeta.mainClass)
    arguments = arguments.concat(getGameArguments(version, meta, fabricMeta))
    return insertValues(arguments, values)
}

const launch = (version, account, statusCallback) => {
    const dir = getMinecraftDir()
    const versionsDir = join(dir, 'versions')
    const metaDir = join(versionsDir, version.minecraft_version)
    const fabricDir = join(versionsDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}`)
    const jar = join(fabricDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}.jar`)
    const separator = platform() == 'win32' ? ';' : platform() == 'linux' ? ':' : undefined
    const nativesDirectory = join(dir, 'natives', version.minecraft_version)
    const libraryDir = join(dir, 'libraries')
    const modsDir = join(getDirectory(), 'versions', version.id, 'mods')
    const modsCallback = (success, meta, fabricMeta, libraries) => {
        if (success) {
            //refreshTokens(account).then(success => authenticationCallback(success, meta, fabricMeta))
            const accessToken = account.minecraft_access_tokens.find(token => token.expiration > new Date().getTime()).token
            statusCallback('launching')
            /*log(Object.keys(meta))
            meta.mainClass = fabricMeta.mainClass
            libraries = libraries.map(library => {
                return library[1]//join(libraryDir, library.downloads.artifact.path)
            }).concat(fabricMeta.libraries.map(library => {
                return join(libraryDir, library.name.split(':')[0].replace('.', '/').replace('.', '/'), library.name.split(':')[1], library.name.split(':')[2], `${library.name.split(':')[1]}-${library.name.split(':')[2]}.jar`)
            })).join(separator)
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
            var jvmArguments = meta.arguments && meta.arguments.jvm ? meta.arguments.jvm : []
            if (fabricMeta.arguments && fabricMeta.arguments.jvm) jvm = meta.arguments.jvm.concat(fabricMeta.arguments.jvm)
            jvmArguments = jvmArguments.concat([
                `-Xmx${memory}M`,
                '-Dlog4j2.formatMsgNoLookups=true',
                '-Dfabric.addMods=' + readdirSync(modsDir).map(mod => join(modsDir, mod)).join(separator)
            ])
            var arguments = []
            arguments = arguments.concat(jvmArguments)
            arguments.push(meta.mainClass)
            if (meta.arguments && meta.arguments.game) arguments = arguments.concat(meta.arguments.game)
            if (meta.arguments && meta.minecraftArguments) arguments = arguments.concat(meta.minecraftArguments)
            meta.arguments.game = meta.arguments.game.concat(fabricMeta.arguments.game)
            if (fabricMeta.arguments && fabricMeta.arguments.jvm) jvm = meta.arguments.jvm.concat(fabricMeta.arguments.jvm)
            console.log(jvmArguments)
            meta.arguments.jvm.filter(arg => !arg.rules || arg.rules.every(checkRule)).forEach(arg => {
                if (arg.value) {
                    if (Array.isArray(arg.value)) for (value of arg.value) jvmArguments.push(value)
                    else jvmArguments.push(arg.value)
                } else jvmArguments.push(arg)
            })
            meta.arguments.game.filter(arg => !arg.rules || arg.rules.every(checkRule)).forEach(arg => {
                if (arg.value) {
                    if (Array.isArray(arg.value)) for (value of arg.value) jvmArguments.push(value)
                    else arguments.push(arg.value)
                } else arguments.push(arg)
            })*/
            rmSync(join(getDirectory(), 'tmpmods'), {recursive: true, force: true})
            if (existsSync(join(dir, 'mods'))) cpSync(join(dir, 'mods'), join(getDirectory(), 'tmpmods'), {recursive: true, force: true})
            rmSync(join(dir, 'mods'), {recursive: true, force: true})
            const arguments = getArguments(version, meta, fabricMeta, libraries, account, accessToken)
            const process = spawn(join(getJavaPath(meta.javaVersion.component), 'bin', 'javaw'), arguments, {
                cwd: dir,
                env: {PATH: env.PATH + separator + getJavaPath(meta.javaVersion.component)},
                detached: true
            })
            process.stdout.on('data', data => {
                if (data.toString().includes('Loading ') && data.toString().includes(' mods:')) {
                    if (existsSync(join(getDirectory(), 'tmpmods'))) cpSync(join(getDirectory(), 'tmpmods'), join(dir, 'mods'), {recursive: true, force: true})
                }
            }).pipe(stdout)
            process.unref()
            statusCallback('done')
        } else statusCallback('error')
    }
    const assetsCallback = (success, meta, fabricMeta, libraries) => {
        if (success) {
            statusCallback('downloading_mods')
            downloadMods(version, success => modsCallback(success, meta, fabricMeta, libraries))
        } else statusCallback('error')
    }
    const nativesCallback = (success, meta, fabricMeta, libraries) => {
        if (success) {
            statusCallback('downloading_assets')
            downloadAssets(meta, success => assetsCallback(success, meta, fabricMeta, libraries))
        } else statusCallback('error')
    }
    const librariesCallback = (success, meta, fabricMeta, libraries) => {
        if (success) {
            statusCallback('extracting_natives')
            extractNatives(meta, collectNatives(meta, checkRule), nativesDirectory, separator, success => nativesCallback(success, meta, fabricMeta, libraries))
        } else statusCallback('error')
    }
    const fabricCallback = (success, meta) => {
        if (success) {
            const fabricMeta = JSON.parse(readFileSync(join(fabricDir, `fabric-loader-${version.fabric_version}-${version.minecraft_version}.json`)))
            statusCallback('downloading_libraries')
            const libraries = collectLibraries(meta, checkRule)
            downloadFilesAsync(libraries, undefined, log, success => librariesCallback(success, meta, fabricMeta, libraries))
        } else statusCallback('error')
    }
    const javaCallback = (success, meta) => {
        if (success) {
            statusCallback('downloading_fabric')
            downloadFabric(version, meta, success => fabricCallback(success, meta))
        } else statusCallback('error')
    }
    const metaCallback = success => {
        if (success) {
            var meta = JSON.parse(readFileSync(join(metaDir, `${version.minecraft_version}.json`)))
            if (version.overrides && version.overrides.meta) Object.assign(meta, version.overrides.meta)
            const values = {
                arch: platform() == 'win32' ? (arch == 'x64' ? '64' : '32') : ''
            }
            meta = JSON.parse(replaceValues(JSON.stringify(meta), values))
            statusCallback('downloading_java')
            downloadJava(meta.javaVersion.component, success => javaCallback(success, meta))
        } else statusCallback('error')
    }
    statusCallback('downloading')
    statusCallback('downloading_meta')
    downloadMeta(version).then(metaCallback)
}

module.exports = {launch, getSimpleClientVersions}