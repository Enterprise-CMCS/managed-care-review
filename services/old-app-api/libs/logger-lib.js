export class RequestLogger {
    constructor() {
        this.logPairs = {}
        this.logPairs['start'] = new Date()
    }

    addKey(key, value) {
        this.logPairs[key] = value
    }

    addError(code, message) {
        this.logPairs['error_code'] = code
        this.logPairs['error_message'] = message
    }

    writeLog() {
        this.logPairs['end'] = new Date()
        let duration_ms = this.logPairs['end'] - this.logPairs['start']
        this.logPairs['duration_ms'] = duration_ms

        console.log(JSON.stringify(this.logPairs))
    }
}
