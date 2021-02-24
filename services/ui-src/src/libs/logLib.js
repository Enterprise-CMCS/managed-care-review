import { logEventCall } from './api.js';

export async function logEvent(name, data) {
    const event = Object.assign({}, data);
    event.name = name;
    event.timestamp = new Date();

    console.log('logging', event);

    return await logEventCall(event);
}
