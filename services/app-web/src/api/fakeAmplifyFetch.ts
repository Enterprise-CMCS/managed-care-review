import { API } from 'aws-amplify'
import { AxiosResponse } from 'axios'

function fetchResponseFromAxios(axiosResponse: AxiosResponse): Response {
    const fakeFetchResponse: Response = {
        headers: axiosResponse.headers,
        status: axiosResponse.status,
        ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
        statusText: axiosResponse.statusText,
        redirected: false,
        type: 'basic',
        url: axiosResponse.request.url,

        body: axiosResponse.data,

        // this appears to actually be called by apollo-client and matter
        text: () => {
            return new Promise<string>((resolve) => {
                resolve(JSON.stringify(axiosResponse.data))
            })
        },

        json: () => {
            return new Promise<string>((resolve) => {
                console.log('FAKE JSON')
                resolve(axiosResponse.data)
            })
        },

        formData: () => {
            return new Promise<FormData>((resolve) => {
                console.log('FAKE FORM DATA')
                resolve(axiosResponse.data)
            })
        },

        bodyUsed: false,
        blob: () => {
            throw new Error('never call blob')
        },
        arrayBuffer: () => {
            throw new Error('never call arrayBuffer')
        },

        clone: () => {
            throw new Error('never call clone')
        },
    }

    return fakeFetchResponse
}

// fakeAmplify Fetch looks like the API for fetch, but is secretly making an amplify request
// Apollo Link uses the ~fetch api for it's client-side middleware.
// Amplify.API uses axios undeneath and does its own transformation of the body, so we wrap that up here.
export async function fakeAmplifyFetch(
    uri: string,
    options: RequestInit
): Promise<Response> {
    if (options.method !== 'POST') {
        throw new Error('unexpected GQL request')
    }

    let amplifyBody = {}
    if (options.body && typeof options.body === 'string') {
        amplifyBody = JSON.parse(options.body)
    }

    // Amplify sets its own content-type and accept headers
    // if we try and override the content-type it breaks the signature, so we need to delete them.
    // This is ugly. There might be a cleverer way to do this with typescript but I'm not sure
    // options.headers is of type HeaderInit | string[][] | Record<string, string>
    const headers: { [header: string]: string } = Object.assign(
        {},
        options.headers
    ) as { [header: string]: string }

    delete headers['accept']
    delete headers['content-type']

    const apiOptions = {
        response: true,
        body: amplifyBody,
        headers: headers,
    }

    return new Promise<Response>((resolve, reject) => {
        API.post('api', uri, apiOptions)
            .then((apiResponse: AxiosResponse) => {
                // The Apollo Link wants a fetch.Response shaped response,
                // not the axios shaped response that Amplify.API returns
                const fakeFetchResponse = fetchResponseFromAxios(apiResponse)
                resolve(fakeFetchResponse)
            })
            .catch((e) => {
                // AXIOS rejects non 200 responsese, but fetch does not.
                if (e.response) {
                    const fakeFetchResponse = fetchResponseFromAxios(e.response)
                    resolve(fakeFetchResponse)
                    return
                } else if (e.request) {
                    reject(e)
                } else {
                    reject(e)
                }
            })
    })
}
