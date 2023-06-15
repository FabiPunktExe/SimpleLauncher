const getSimpleClientVersions = callback => {
    fetch('https://simpeclient.github.io/SimpleWebsite/versions.json').catch(console.log).then(response => {
        if (response && response.ok) {
            response.json().then(callback)
        }
    })
}

const downloadVersion = (id, statusCallback) => {
}

const launch = id => {
}

module.exports = {launch, getSimpleClientVersions}