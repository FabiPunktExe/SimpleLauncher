const { spawnSync, spawn } = require("child_process")
const { existsSync, mkdirSync, readdirSync, statSync } = require("fs")
const { platform, homedir } = require("os")
const { join } = require('path')

const getDirectory = () => {
    const directory = join(homedir(), '.simplelauncher')
    if (!existsSync(directory)) mkdirSync(directory)
    return directory
}

function getPath() {
    var path = process.env.PATH
    if (existsSync(join(getDirectory(), 'java'))) {
        readdirSync(join(getDirectory(), 'java')).forEach(file => {
            if (statSync(join(getDirectory(), 'java', file)).isDirectory()) {
                if (platform() == 'win32') path += getDirectory() + '\\java\\' + file + '\\bin;'
                if (platform() == 'linux') path += getDirectory() + ':/java/' + file + '/bin'
            }
        })
    }
    return path
}

function getOptions() {
    return {env: {PATH: getPath()}}
}

const runSync = (cmd, ...args) => spawnSync(cmd, args, getOptions())
const runAsync = (cmd, ...args) => spawn(cmd, args, getOptions())

module.exports = {getDirectory, getPath, runSync, runAsync}