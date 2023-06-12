const { platform } = require("os")
const { runSync, runAsync, getDirectory } = require("./util")
const { spawn } = require("child_process")
const { join } = require("path")
const AdmZip = require("adm-zip")

const getJavaVersion = () => {
    const output = runSync('java', '-version').output
    if (output) return output.toString().split('\"')[1]
    else return undefined
}

const downloadJava = (statusCallback) => {
    if (platform() == 'win32') {
        statusCallback('downloading_java')
        runAsync(
            'curl',
            'https://aka.ms/download-jdk/microsoft-jdk-17.0.7-windows-x64.zip',
            '-o',
            join(getDirectory(), 'java.zip')
        ).on('exit', code => {
            if (code == 0) {
                statusCallback('unpacking_java')
                const zip = new AdmZip(join(getDirectory(), 'java.zip'))
                if (zip.getEntryCount() == 1) {
                    zip.getEntries().forEach(file => {
                        zip.extractEntryTo(file.name, join(getDirectory(), 'java'))
                        statusCallback('done')
                    })
                } else statusCallback('error')
            } else statusCallback('error')

        })
    } else if (os.platform() == 'linux') {
        statusCallback('downloading_java')
        runAsync(
            'curl',
            'https://aka.ms/download-jdk/microsoft-jdk-17.0.7-linux-x64.tar.gz',
            '-o',
            join(getDirectory(), 'java.tar.gz')
        ).on('exit', code => {
            if (code == 0) {
                statusCallback('unpacking_java')
                runAsync(
                    'gzip',
                    '-d',
                    join(getDirectory(), 'java.tar.gz')
                ).on('exit', code => {
                    const output = runSync(
                        'tar',
                        '-t',
                        '-f',
                        join(getDirectory(), 'java.tar')
                    ).output.toString()
                    if (code == 0 && output.split('\n').length == 1) {
                        runAsync(
                            'tar',
                            '-x',
                            '-f',
                            join(getDirectory(), 'java.tar')
                        ).on('exit', code => {
                            if (code == 0) {
                                runAsync(
                                    'mv',
                                    join(getDirectory(), output),
                                    join(getDirectory(), 'java')
                                ).on('exit', code => {
                                    if (code == 0) statusCallback('done')
                                    else statusCallback('error')
                                })
                            } else statusCallback('error')
                        })
                    } else statusCallback('error')
                })
                const zip = new AdmZip(join(getDirectory(), 'java.zip'))
                if (zip.getEntryCount() == 1) {
                    zip.getEntries().forEach(file => {
                        zip.extractEntryTo(file.name, join(getDirectory(), 'java'))
                        statusCallback('done')
                    })
                } else statusCallback('error')
            } else statusCallback('error')
        })
    }
}

module.exports = {getJavaVersion, downloadJava}