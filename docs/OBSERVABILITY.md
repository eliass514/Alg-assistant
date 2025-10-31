# Observability Strategy

This document outlines the observability strategy for the application, covering structured logging, metrics, tracing, and future integration plans.

## Overview

The application implements a comprehensive observability approach to ensure system health monitoring, debugging capabilities, and performance analysis. The strategy is designed to work with modern deployment platforms while remaining flexible for future integrations with dedicated observability platforms.

## Structured Logging

### Implementation

The application uses **Pino** for structured logging via the `nestjs-pino` integration. Pino is a fast, low-overhead logging library that outputs JSON-formatted logs by default.

#### Key Features

- **JSON Output**: All logs are emitted in JSON format, making them easily parseable by log aggregation systems
- **Request Correlation**: Each HTTP request is assigned a unique `requestId` that is included in all related logs
- **Context Information**: Logs include relevant context such as:
  - Request method and URL
  - User ID (when authenticated)
  - HTTP status codes
  - Response times
  - Error stack traces
- **Sensitive Data Redaction**: Authorization headers and cookies are automatically redacted from logs
- **Log Levels**: Configurable via `LOG_LEVEL` environment variable (defaults to `debug` in development, `info` in production)

#### What Gets Logged

1. **HTTP Requests**: All incoming HTTP requests with method, URL, status code, and response time
2. **Errors**: All exceptions with full stack traces and context
3. **Application Events**: Key business operations such as:
   - User registration and authentication
   - Document uploads and processing
   - Appointment scheduling
   - Service operations
4. **Database Operations**: Significant database events via Prisma middleware (if configured)

#### Log Levels

- `fatal`: System is unusable
- `error`: Error events that might still allow the application to continue running
- `warn`: Potentially harmful situations
- `info`: Informational messages that highlight application progress
- `debug`: Fine-grained informational events useful for debugging
- `trace`: Very detailed information (not used in production)

### Log Collection

Logs are written to **stdout** and **stderr**, following the [12-factor app](https://12factor.net/logs) methodology. This allows the deployment platform or container orchestrator to capture and forward logs to their logging infrastructure.

#### Deployment Platform Integration

- **Docker**: Logs are captured via the Docker logging driver
- **Kubernetes**: Logs are collected by the kubelet and forwarded to the cluster's logging solution
- **Cloud Platforms** (AWS, GCP, Azure): Native log collection services capture container output:
  - AWS: CloudWatch Logs
  - GCP: Cloud Logging (formerly Stackdriver)
  - Azure: Azure Monitor Logs

#### Local Development

In development mode, logs are output in JSON format to ensure consistency across all environments and facilitate parsing by log aggregation tools. Developers can pipe the output through `pino-pretty` locally when they need a human-readable, colorized view:

```bash
pnpm --filter api dev | pnpx pino-pretty
```

### Best Practices

When logging in application code:

```typescript
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class MyService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(MyService.name);
  }

  someMethod(userId: string) {
    // Structured logging with context
    this.logger.info({ userId, action: 'operation_started' }, 'User operation initiated');

    try {
      // ... business logic
      this.logger.debug({ userId, result: 'success' }, 'Operation completed');
    } catch (error) {
      // Error logging with full context
      this.logger.error({ err: error, userId }, 'Operation failed');
      throw error;
    }
  }
}
```

## Metrics

### Basic Metrics from Deployment Platform

Most modern deployment platforms provide basic infrastructure and application metrics out of the box:

#### Infrastructure Metrics

- **CPU Usage**: Percentage of CPU utilized by the application container
- **Memory Usage**: Memory consumption and limits
- **Disk I/O**: Read/write operations and throughput
- **Network I/O**: Incoming and outgoing network traffic

#### Application Metrics (HTTP)

- **Request Rate**: Number of HTTP requests per second
- **Request Latency**: Response time distribution (p50, p95, p99)
- **Error Rate**: Percentage of failed requests (4xx, 5xx status codes)
- **Throughput**: Data transferred per second

#### Database Metrics

- **Connection Pool**: Active and idle connections
- **Query Performance**: Slow query detection (via database provider)
- **Transaction Rate**: Database operations per second

### Platform-Specific Metrics

#### Docker / Docker Compose

- Use `docker stats` for real-time container metrics
- Metrics available via Docker API

#### Kubernetes

- Metrics via Metrics Server API
- Resource usage visible in dashboard or via `kubectl top`

#### Cloud Platforms

- **AWS**: CloudWatch provides automatic metrics for ECS, EKS, Lambda, and other services
- **GCP**: Cloud Monitoring collects metrics from GKE, Cloud Run, and other services
- **Azure**: Azure Monitor provides metrics for Container Instances, AKS, and App Service

### Custom Metrics (Future Enhancement)

For more detailed application-specific metrics, consider implementing:

- Custom Prometheus metrics via `@willsoto/nestjs-prometheus`
- Business metrics (e.g., successful document verifications, appointments booked)
- Performance metrics (e.g., third-party API call latency)

## Tracing (Future Enhancement)

Distributed tracing is not currently implemented but is planned for future releases. Potential integrations:

- **OpenTelemetry**: Vendor-neutral standard for distributed tracing
- **Jaeger**: Open-source distributed tracing system
- **AWS X-Ray**: For AWS deployments
- **Google Cloud Trace**: For GCP deployments

## Health Checks

The application exposes health check endpoints for container orchestration:

- `GET /api/health`: Returns application health status
- Response includes service name, environment, and timestamp

These endpoints are used by:

- Load balancers for routing decisions
- Container orchestrators for restart policies
- Monitoring systems for uptime checks

## Alerting (Future Enhancement)

While basic platform alerts are available through deployment infrastructure, consider implementing:

- **Error Rate Alerts**: Notify when error rate exceeds threshold
- **Latency Alerts**: Trigger when response times degrade
- **Resource Alerts**: Alert on high CPU/memory usage
- **Business Alerts**: Custom alerts for critical business operations

## Integration with Observability Platforms

The application is designed to integrate seamlessly with dedicated observability platforms when needed:

### Datadog

- **APM**: Automatic instrumentation with `dd-trace`
- **Log Management**: Forward structured logs to Datadog
- **Infrastructure Monitoring**: Agent-based metrics collection
- **Real User Monitoring**: Frontend performance tracking

### Grafana Stack

- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation from JSON logs
- **Prometheus**: Metrics collection and alerting
- **Tempo**: Distributed tracing

### Sentry

- **Error Tracking**: Automatic error capture and reporting
- **Performance Monitoring**: Transaction and span tracking
- **Release Tracking**: Monitor errors by deployment version

### Elastic Stack (ELK)

- **Elasticsearch**: Log storage and search
- **Logstash**: Log processing pipeline
- **Kibana**: Log visualization and dashboards

### New Relic

- **APM**: Application performance monitoring
- **Infrastructure**: Server and container monitoring
- **Log Management**: Centralized logging

## Environment Variables

The following environment variables control logging behavior:

- `LOG_LEVEL`: Log level (trace, debug, info, warn, error, fatal). Defaults to `debug` in development, `info` in production
- `NODE_ENV`: Environment mode (`development`, `production`, `test`)

## Migration Guide

### Adding an Observability Platform

When integrating a new observability platform:

1. **Install Required Packages**:

   ```bash
   pnpm add [platform-specific-sdk] --filter api
   ```

2. **Configure Platform Integration**:
   - Add platform configuration to app.module.ts
   - Set up environment variables for API keys and endpoints

3. **Update Documentation**:
   - Document new environment variables in `ENVIRONMENT_VARIABLES.md`
   - Add platform-specific setup instructions

### Example: Adding Datadog

```typescript
// In main.ts
import tracer from 'dd-trace';

tracer.init({
  logInjection: true,
  runtimeMetrics: true,
});

// Rest of bootstrap code...
```

## Monitoring Checklist

Ensure the following are being monitored:

- [x] HTTP request logs (method, URL, status, latency)
- [x] Error logs with stack traces
- [x] Authentication events
- [x] Application startup and shutdown
- [ ] Database query performance (future)
- [ ] Third-party API calls (future)
- [ ] Custom business metrics (future)
- [ ] Distributed traces (future)

## Resources

- [Pino Documentation](https://getpino.io/)
- [nestjs-pino Documentation](https://github.com/iamolegga/nestjs-pino)
- [12-Factor App: Logs](https://12factor.net/logs)
- [OpenTelemetry](https://opentelemetry.io/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)

## Support

For questions or issues related to observability:

1. Check application logs for error messages
2. Review this documentation
3. Consult the platform-specific monitoring dashboard
4. Contact the development team with log context and request IDs
