import * as opentelemetry from '@opentelemetry/api'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { AwsLambdaInstrumentation } from '@opentelemetry/instrumentation-aws-lambda'
import { Resource } from '@opentelemetry/resources'
import {
    ConsoleSpanExporter,
    SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

console.log('LOading Lambda OTEL Handler wrapperrrrrrr')

// registerInstrumentations({
//     instrumentations: [
//         new AwsLambdaInstrumentation({
//             disableAwsContextPropagation: true,
//             requestHook: (span, { event, context }) => {
//                 console.log('IN REQUEST HOOK WOIFNEWOINFWIOFNd')
//                 span.setAttribute('app.name', context.functionName)
//                 span.setAttribute('started', true)
//             },
//             responseHook: (span, { err, res }) => {
//                 console.log('IN RESPONSE HOOK WOEINFWOINFIOWEF')
//                 span.setAttribute('finished', true)
//                 if (err instanceof Error)
//                     span.setAttribute('app.error', err.message)
//                 if (res) span.setAttribute('app.res', res)
//             },
//         }),
//     ],
// })

const provider = new NodeTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'my-little-service',
    }),
})

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
provider.register()

registerInstrumentations({
    // // when boostraping with lerna for testing purposes
    instrumentations: [
        new AwsLambdaInstrumentation({
            disableAwsContextPropagation: true,
            requestHook: (span, { event, context }) => {
                console.log('IN REQUEST HOOK WOIFNEWOINFWIOFNd')
                span.setAttribute('app.name', context.functionName)
                span.setAttribute('started', true)
            },
            responseHook: (span, { err, res }) => {
                console.log('IN RESPONSE HOOK WOEINFWOINFIOWEF')
                span.setAttribute('finished', true)
                if (err instanceof Error)
                    span.setAttribute('app.error', err.message)
                if (res) span.setAttribute('app.res', res)
            },
        }),
    ],
})

export const tracer = opentelemetry.trace.getTracer('http-example')

// -------- no more setup for OTEL --------
