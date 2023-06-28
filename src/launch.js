const { resolve, join } = require('path')
const { Worker } = require('worker_threads')
const { isMainThread, workerData } = require('worker_threads')

//if (!isMainThread) require('./minecraft').launch(workerData.version, workerData.account, status => parentPort.postMessage(status))

const launch = async (version, account, statusCallback) => {
    /*new Worker(__filename, {
        workerData: {
            version: version,
            account: account
        },
    }).on('message', statusCallback)*/
    setTimeout(() => require('./minecraft').launch(version, account, statusCallback))
}

module.exports = {launch}