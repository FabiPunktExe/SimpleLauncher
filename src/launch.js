const { Worker, parentPort, isMainThread, workerData } = require('worker_threads')

if (!isMainThread) require('./minecraft').launch(workerData.version, workerData.account, status => parentPort.postMessage(status))

const launch = (version, account, statusCallback) => {
    statusCallback('starting')
    statusCallback('authenticating')
    require('./auth').refreshTokens(account).then(success => {
        if (success) {
            new Worker(__filename, {
                workerData: {
                    version: version,
                    account: account
                },
            }).on('message', statusCallback)
        } else statusCallback('error')
    })
}

module.exports = {launch}