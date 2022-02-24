// import * as opentelemetry from '@opentelemetry/api'
// import { AwsLambdaInstrumentation } from '@opentelemetry/instrumentation-aws-lambda'
// import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
// import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
// import { GraphQLInstrumentation } from "@opentelemetry/instrumentation-graphql";
// import { registerInstrumentations } from "@opentelemetry/instrumentation";
// import { NodeTracerProvider } from "@opentelemetry/node";
// import { SimpleSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/tracing";
// import { Resource } from "@opentelemetry/resources";
// import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'


// console.log('LOading Lambda OTEL Handler wrapperrrrrrr')

// const provider = new NodeTracerProvider({
//     resource: Resource.default().merge(new Resource({
//         // Replace with any string to identify this service in your system
//         "service.name": "my-little-service",
//       })),
// })

// provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
// provider.register()

// registerInstrumentations({
//     // // when boostraping with lerna for testing purposes
//     instrumentations: [
//         // new AwsLambdaInstrumentation(),
//         // new HttpInstrumentation(),
//         new ExpressInstrumentation(),
//         // new GraphQLInstrumentation({
//         //     allowValues: true,
//         //     depth: 10,
//         // }),
//     ],
// })

// export const tracer = opentelemetry.trace.getTracer('http-example')

// -------- no more setup for OTEL --------

'use strict';

import opentelemetry from "@opentelemetry/api";
import { Span, SpanStatusCode, } from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";
import { AwsLambdaInstrumentation } from "@opentelemetry/instrumentation-aws-lambda";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { GraphQLInstrumentation } from "@opentelemetry/instrumentation-graphql";
import type * as graphqlTypes from "graphql"

const EXPORTER = process.env.EXPORTER || '';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// module.exports = (serviceName) => {
const simpleHook = (span: Span, data: any) => {
  if (data.data) {
    console.log("graphql data: ", data.data)
  }
}

  const gqlResponseHook = (span: Span, data: graphqlTypes.ExecutionResult) => {
    if (data.errors && data.errors.length > 0) {
      span.recordException({
        name: "graphql.execution.error",
        message: JSON.stringify(data.errors),
      })
      span.setStatus({
        code: SpanStatusCode.ERROR,
      })
      const firstErr = data.errors[0]
      if (firstErr.message != "") {
        span.setAttribute("graphql.error.message", firstErr.message)
      }
      span.setAttribute("graphql.error.type", firstErr.constructor.name)
      if (firstErr.path) {
        span.setAttribute("graphql.error.path", firstErr.path.join("."))
      }
      if (firstErr.originalError) {
        span.setAttribute(
          `graphql.error.original.type`,
          firstErr.originalError.constructor.name,
        )
        if (firstErr.originalError.message != "") {
          span.setAttribute(
            `graphql.error.original.message`,
            firstErr.originalError.message,
          )
        }
      }
      data.errors.forEach((err, idx) => {
        if (err.message != "") {
          span.setAttribute(`graphql.error.${idx}.message`, err.message)
        }
        span.setAttribute(`graphql.error.${idx}.type`, err.constructor.name)
        if (err.path) {
          span.setAttribute(`graphql.error.${idx}.path`, err.path.join("."))
        }
        if (err.originalError) {
          span.setAttribute(
            `graphql.error.${idx}.original.type`,
            err.originalError.constructor.name,
          )
          if (err.originalError.message != "") {
            span.setAttribute(
              `graphql.error.${idx}.original.message`,
              err.originalError.message,
            )
          }
        }
      })
    }
  }
  let exporter;
const provider = new NodeTracerProvider({
    resource: Resource.default().merge(new Resource({
        // Replace with any string to identify this service in your system
        "service.name": "my-little-service",
      })),
})

  if (EXPORTER.toLowerCase().startsWith('z')) {
    exporter = new ZipkinExporter();
  } else {
    exporter = new JaegerExporter();
  }

  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
  provider.register();

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new GraphQLInstrumentation({
        mergeItems: true,
        allowValues: true,
        responseHook: simpleHook,
      }),
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
  });

  export const tracer = opentelemetry.trace.getTracer('http-example')
// };
