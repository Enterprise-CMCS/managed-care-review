export class RequestLogger {

	constructor() {
		this.logPairs= {};
		this.requestBegan = new Date();
	}

	addKey(key, value) {
		this.logPairs[key] = value;
	}

	addError(code, message) {
		this.logPairs['error_code'] = code;
		this.logPairs['error_message'] = message;
	}

	writeLog() {
		let requestFinished = new Date();
		let duration_ms = requestFinished - this.requestBegan;
		this.logPairs['duration_ms'] = duration_ms;

		console.log(JSON.stringify(this.logPairs));
	}

}
