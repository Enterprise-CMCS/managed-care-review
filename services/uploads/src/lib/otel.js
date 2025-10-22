"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordHistogram = exports.recordException = exports.initMeter = exports.initTracer = void 0;
const api_1 = __importDefault(require("@opentelemetry/api"));
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const resources_1 = require("@opentelemetry/resources");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const id_generator_aws_xray_1 = require("@opentelemetry/id-generator-aws-xray");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
function initTracer(serviceName, otelCollectorURL) {
    console.info('-----Setting OTEL instrumentation-----');
    const resource = resources_1.Resource.default().merge(new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }));
    const exporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: otelCollectorURL,
        headers: {},
    });
    const provider = new sdk_trace_node_1.NodeTracerProvider({
        idGenerator: new id_generator_aws_xray_1.AWSXRayIdGenerator(),
        resource: resource,
    });
    provider.addSpanProcessor(new sdk_trace_base_1.BatchSpanProcessor(exporter));
    // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
    provider.register();
}
exports.initTracer = initTracer;
function initMeter(serviceName) {
    const resource = resources_1.Resource.default().merge(new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }));
    const metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
        exporter: new exporter_metrics_otlp_http_1.OTLPMetricExporter(),
        exportIntervalMillis: 1000,
    });
    const provider = new sdk_metrics_1.MeterProvider({
        resource: resource,
    });
    provider.addMetricReader(metricReader);
    api_1.default.metrics.setGlobalMeterProvider(provider);
}
exports.initMeter = initMeter;
function recordException(error, serviceName, spanName) {
    const tracer = api_1.default.trace.getTracer(serviceName);
    const span = tracer.startSpan(spanName);
    span.recordException(error);
    console.error(error);
}
exports.recordException = recordException;
function recordHistogram(serviceName, metricName, executionTime) {
    const meter = api_1.default.metrics.getMeterProvider().getMeter(serviceName);
    const timeAvScan = meter.createHistogram(metricName);
    timeAvScan.record(executionTime);
}
exports.recordHistogram = recordHistogram;
//# sourceMappingURL=otel.js.map