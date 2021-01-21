import config from './config';


export function logEvent(name: string, data: object) {

	const ev: Record<string, any> = Object.assign({}, data)
	ev['name'] = name
	ev['timestamp'] = new Date()

	const logEventURL = config.apiGateway.URL + '/log_event'

	fetch(logEventURL, {
		method: 'POST',
		body: JSON.stringify(ev),
	})


}