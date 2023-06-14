const { spawnSync, spawn } = require("child_process")
const { existsSync, mkdirSync, readdirSync, statfsSync, statSync } = require("fs")
const { userInfo, platform } = require("os")
const { join } = require('path')

const getDirectory = () => {
    const directory = join(userInfo().homedir, '.simplelauncher')
    if (!existsSync(directory)) mkdirSync(directory)
    return directory
}

function getOptions() {
    var path = process.env.PATH
    if (existsSync(join(getDirectory(), 'java'))) {
        readdirSync(join(getDirectory(), 'java')).forEach(file => {
            if (statSync(join(getDirectory(), 'java', file)).isDirectory()) {
                if (platform() == 'win32') path += getDirectory() + '\\java\\' + file + '\\bin;'
                if (platform() == 'linux') path += getDirectory() + ':/java/' + file + '/bin'
            }
        })
    }
    return {env: {PATH: path}}
}

const runSync = (cmd, ...args) => spawnSync(cmd, args, getOptions())
const runAsync = (cmd, ...args) => spawn(cmd, args, getOptions())

module.exports = {getDirectory, runSync, runAsync}