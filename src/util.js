const { existsSync, mkdirSync } = require("fs")
const { homedir, platform } = require("os")
const { join } = require('path')
const { env } = require("process")

const getDirectory = () => {
    const directory = join(homedir(), '.simplelauncher')
    if (!existsSync(directory)) mkdirSync(directory)
    return directory
}

const getMinecraftDir = () => {
    if (platform() == 'win32') return join(env.APPDATA, '.minecraft')
    else if (platform() == 'linux')  return join(homedir(), '.minecraft')
    else return undefined
}

module.exports = {getDirectory, getMinecraftDir}