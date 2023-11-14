import http from 'node:http'

// httpRequest wraps node's http request in a promise.
// Right now this only supports getting a URL, but could be extended to cover the whole api
async function httpRequest(url: string): Promise<string | Error> {
    return new Promise(function (resolve, _reject) {
        const req = http.request(url, function (res) {
            // reject on bad status
            if (
                !res.statusCode ||
                res.statusCode < 200 ||
                res.statusCode >= 300
            ) {
                return resolve(new Error('statusCode=' + res.statusCode))
            }
            // accumulate data
            const body: Uint8Array[] = []
            res.on('data', function (chunk) {
                body.push(chunk)
            })
            // resolve on end
            res.on('end', function () {
                try {
                    const bodyString = Buffer.concat(body).toString()
                    resolve(bodyString)
                } catch (e) {
                    console.error('body Error', e)
                    resolve(e)
                }
            })
        })
        // reject on request error
        req.on('error', function (err) {
            // This is not a "Second reject", just a different sort of failure
            resolve(err)
        })
        // IMPORTANT
        req.end()
    })
}

export { httpRequest }
