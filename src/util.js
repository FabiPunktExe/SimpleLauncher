const { spawnSync, spawn } = require("child_process")
const { existsSync, mkdirSync } = require("fs")
const { userInfo, platform } = require("os")
const { join } = require('path')

const getDirectory = () => {
    const directory = join(userInfo().homedir, '.simpleclient')
    if (!existsSync(directory)) mkdirSync(directory)
    return directory
}

function getOptions() {
    if (platform() == 'win32') return {env: {PATH: process.env.PATH + getDirectory() + '\\java\\bin;'}}
    else if (os.platform() == 'linux') return {env: {PATH: process.env.PATH + ':' + getDirectory() + '/java/bin'}}
}

const runSync = (cmd, ...args) => spawnSync(cmd, args, getOptions())
const runAsync = (cmd, ...args) => spawn(cmd, args, getOptions())

module.exports = {getDirectory, runSync, runAsync}