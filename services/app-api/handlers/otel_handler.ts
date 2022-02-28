import opentelemetry from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-grpc"
import { SimpleSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const provider = new NodeTracerProvider({
    resource: Resource.default().merge(new Resource({
        "service.name": "mc-review",
      })),
})

// log to console and send to New Relic
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
provider.addSpanProcessor(new SimpleSpanProcessor(new OTLPTraceExporter()))

// Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
provider.register();

export const tracer = opentelemetry.trace.getTracer('http-example')
