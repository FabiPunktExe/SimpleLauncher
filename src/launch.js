const { resolve, join } = require('path')
const { Worker, workerData } = require('worker_threads')
const { isMainThread, parentPort } = require('worker_threads')

if (!isMainThread) require('./minecraft').launch(workerData.version, workerData.account, status => parentPort.postMessage(status))

const launch = async (version, account, statusCallback) => {
    new Worker(resolve(join(__dirname, 'launch.js')), {
        workerData: {
            version: version,
            account: account
        }
    }).on('message', statusCallback)
}

module.exports = {launch}