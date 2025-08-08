function handler(event) {
    var response = event.response;
    var headers = response.headers;
    headers['strict-transport-security'] = {
        value: 'max-age=63072000; includeSubdomains; preload',
    };
    return response;
}
