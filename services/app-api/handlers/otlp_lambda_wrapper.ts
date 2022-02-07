import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { AwsLambdaInstrumentation } from '@opentelemetry/instrumentation-aws-lambda'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

const provider = new NodeTracerProvider()
provider.register()

// faas stands for "Function as a Service" in OpenTelemetry terminology:
// https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/faas.md
registerInstrumentations({
    instrumentations: [
        getNodeAutoInstrumentations(),
        new AwsLambdaInstrumentation({
            disableAwsContextPropagation: true,
            requestHook: (span, { context }) => {
                span.setAttributes('faas.name', context.functionName)
            },
            responseHook: (span, { err, res }) => {
                if (err instanceof Error)
                    span.setAttributes('faas.error', err.message)
                if (res) span.setAttributes('faas.res', res)
            },
        }),
    ],
})
