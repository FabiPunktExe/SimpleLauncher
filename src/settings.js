var settings
const file = join(getDirectory(), 'settings.json')

const loadSettings = () => settings = existsSync(file) ? JSON.parse(readFileSync(file)) : {}

const saveSettings = () => writeFileSync(file, JSON.stringify(accounts))

const getSetting = (key, defaultValue) => {
    if (!settings) load()
    if (defaultValue && !(key in settings)) settings[key] = defaultValue
    return settings[key]
}

const setSetting = (key, value) => {
    if (!settings) load()
    settings[key] = value
    save()
}

module.exports = {loadSettings, saveSettings, getSetting, setSetting}