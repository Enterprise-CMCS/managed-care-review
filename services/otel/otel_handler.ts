import opentelemetry from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import { OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-grpc"
import { SimpleSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";

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

export const tracer = opentelemetry.trace.getTracer('tracer-provider')
