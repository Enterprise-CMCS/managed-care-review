# 016 - Use OTEL for monitoring via New Relic

We need a way to gather performance data and monitor our application. We also would like to receive alerts for particular error conditions so that we can investigate errors before they are reported by users. This means we need to choose a monitoring and observability library and backend to collect this data.

## Considered Options

### Open Telemetry

Open Telemetry (OTEL) is an open source standard for application instrumentation. It consists of APIs, SDKs and tools for developers to instrument code in a standardized way. The protocol itself “describes the encoding, transport, and delivery mechanism of telemetry data between telemetry sources, intermediate nodes such as collectors and telemetry backends.”

OTEL in a basic deployment consists of language libraries to instrument your code, an OTEL Collector which can receive the instrumented code, and an OTEL Exporter which sends the data to a configured backend. There are various open source backends (Jaeger, Zipkin) and many established monitoring services now support injesting OTEL metrics (New Relic, Honeycomb).

### New Relic APM

New Relic APM is an application performance monitoring SaaS platform. It consists of language libraries that auto instrument your code and display application performance metrics. The user typically does not write instrumentation on their own and instead relies on the auto-instrumentation.

### Honeycomb

Honeycomb is a datastore and query engine for observability data. It relies on OTEL libraries to do the instrumenting of your code and provides a datastore and query engine to explore the exported data.

## Chosen Decision: Use OTEL with New Relic as the backend datastore.

This decision really came down to the fact that CMS has a contract with New Relic and it is available to our team without needing to do any license aquisition. Since New Relic supports OTEL, we've decided to use OTEL instrumentation over New Relic's APM as we're seeing more of the monitoring and observability world embrace OTEL. This will allow us to choose a different backend in the future if we for any reason need to move providers. Choosing OTEL also pushes us to be more explicit about parts of the application we'd like to monitor, rather than being limited to only what auto instrumentation gives us from a product like NR APM.

By combining OTEL with New Relic we also can use other New Relic features, like AWS infrastructure monitoring, uptime ping metrics, etc.

### Pros/Cons

#### OTEL

-   `+` Open Source solution that many monitoring vendors are standardizing on.
-   `+` Allows for both auto instrumentation and custom instrumentation.
-   `+` AWS provides a lambda layer that is easy to setup and get OTEL stats collected and exported.
-   `+` OSS backends like Jaeger allow us to run traces in local dev environments.
-   `-` High learning curve for our team to begin using.
-   `-` Not all parts of the OTEL standards are stable, particularly in metrics and logs.

#### New Relic APM

-   `+` Easy to install and configure. Not much of a learning curve to get started.
-   `+` CMS already gives teams access to it.
-   `-` If we write custom traces for NR APM then that code only works for NR backend.

#### Honeycomb

-   `+` Powerful query interface.
-   `+` Supports OTEL.
-   `-` CMS does not have a contract and we'd have to aquire a license on our own.
