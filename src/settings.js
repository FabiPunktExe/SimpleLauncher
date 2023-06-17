const { existsSync, writeFileSync, readFileSync } = require("original-fs")
const { join } = require("path")
const { getDirectory } = require("./util")

var settings
const file = join(getDirectory(), 'settings.json')

const loadSettings = () => settings = existsSync(file) ? JSON.parse(readFileSync(file)) : {}

const saveSettings = () => writeFileSync(file, JSON.stringify(settings))

const getSetting = (key, defaultValue) => {
    if (!settings) load()
    if (defaultValue && !(key in settings)) settings[key] = defaultValue
    return settings[key]
}

const setSetting = (key, value) => {
    if (!settings) loadSettings()
    settings[key] = value
    saveSettings()
}

module.exports = {loadSettings, saveSettings, getSetting, setSetting}