const { existsSync, mkdirSync } = require("fs")
const { homedir, platform } = require("os")
const { join } = require('path')
const { env } = require("process")

const getDirectory = () => {
    const directory = platform() == 'win32' ? join(env.APPDATA, '.simplelauncher') : join(homedir(), '.simplelauncher')
    if (!existsSync(directory)) mkdirSync(directory)
    return directory
}

const getMinecraftDir = () => {
    const directory = platform() == 'win32' ? join(env.APPDATA, '.minecraft') : join(homedir(), '.minecraft')
    if (!existsSync(directory)) mkdirSync(directory)
    return directory
}

module.exports = {getDirectory, getMinecraftDir}