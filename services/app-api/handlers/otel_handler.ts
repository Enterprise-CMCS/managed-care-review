import * as opentelemetry from '@opentelemetry/api'
import { AwsLambdaInstrumentation } from '@opentelemetry/instrumentation-aws-lambda'
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { GraphQLInstrumentation } from "@opentelemetry/instrumentation-graphql";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { NodeTracerProvider } from "@opentelemetry/node";
import { SimpleSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/tracing";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'


console.log('LOading Lambda OTEL Handler wrapperrrrrrr')

const provider = new NodeTracerProvider({
    resource: Resource.default().merge(new Resource({
        // Replace with any string to identify this service in your system
        "service.name": "my-little-service",
      })),
})

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
provider.register()

registerInstrumentations({
    // // when boostraping with lerna for testing purposes
    instrumentations: [
        // new AwsLambdaInstrumentation(),
        // new HttpInstrumentation(),
        new ExpressInstrumentation(),
        // new GraphQLInstrumentation({
        //     allowValues: true,
        //     depth: 10,
        // }),
    ],
})

export const tracer = opentelemetry.trace.getTracer('http-example')

// -------- no more setup for OTEL --------

// 'use strict';

// const opentelemetry = require('@opentelemetry/api');
// const { registerInstrumentations } = require('@opentelemetry/instrumentation');
// const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
// const { Resource } = require('@opentelemetry/resources');
// const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
// const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
// const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
// const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
// const { AwsLambdaInstrumentation } = require('@opentelemetry/instrumentation-aws-lambda');
// const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
// const { GraphQLInstrumentation } = require ('@opentelemetry/instrumentation-graphql');

// const EXPORTER = process.env.EXPORTER || '';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// // module.exports = (serviceName) => {

//     const gqlResponseHook = (span, data) => {
//         if (data.errors && data.errors.length > 0) {
//           console.log("graphql error", data.errors);
//         }
      
//         let gqlNestedKeys: string[] = []
//         if (data.data) {
//           gqlNestedKeys = Object.keys(data.data)
//           console.log(data.data)
//         }
//         for (const nestedObj of gqlNestedKeys) {
//           const nestedObjData = data.data?.[nestedObj]
//           if (!nestedObjData) continue
//           if (nestedObjData.errors && nestedObjData.errors.length > 0) {
//             console.log("graphql nested error", nestedObjData.errors);
//           }
//         }
//       }
//   let exporter;
// const provider = new NodeTracerProvider({
//     resource: Resource.default().merge(new Resource({
//         // Replace with any string to identify this service in your system
//         "service.name": "my-little-service",
//       })),
// })

//   if (EXPORTER.toLowerCase().startsWith('z')) {
//     exporter = new ZipkinExporter();
//   } else {
//     exporter = new JaegerExporter();
//   }

//   provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

//   // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
//   provider.register();

//   registerInstrumentations({
//     instrumentations: [
//       // new HttpInstrumentation(),
//       // new GraphQLInstrumentation({
//       //   mergeItems: true,
//       //   allowValues: true,
//       //   responseHook: gqlResponseHook,
//       // }),
//       new AwsLambdaInstrumentation({
//                     disableAwsContextPropagation: true,
//                     requestHook: (span, { event, context }) => {
//                         console.log('IN REQUEST HOOK WOIFNEWOINFWIOFNd')
//                         span.setAttribute('app.name', context.functionName)
//                         span.setAttribute('started', true)
//                     },
//                     responseHook: (span, { err, res }) => {
//                         console.log('IN RESPONSE HOOK WOEINFWOINFIOWEF')
//                         span.setAttribute('finished', true)
//                         if (err instanceof Error)
//                             span.setAttribute('app.error', err.message)
//                         if (res) span.setAttribute('app.res', res)
//                     },
//                 }),
//     ],
//   });

//   export const tracer = opentelemetry.trace.getTracer('http-example')
// };
