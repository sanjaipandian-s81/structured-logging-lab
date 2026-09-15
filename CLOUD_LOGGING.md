# Cloud Logging Mapping Note

This document explains how the structured JSON logs emitted by the `orders-api` service are ingested, parsed, and searched in modern cloud log aggregation systems (e.g., Google Cloud Logging, Grafana Loki, AWS CloudWatch Logs Insights, and Datadog).

---

## 1. Architectural Overview

Following the **12-Factor App methodology**, the `orders-api` service writes structured JSON directly to standard output (`stdout`). 

```
┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│   orders-api    │ ───►  │ Docker Log Driver /  │ ───►  │    Log Collector     │ ───►  │  Cloud Log Platform  │
│ (stdout JSON)   │       │  Container Runtime   │       │ (Fluent Bit/Promtail)│       │ (GCP / Loki / AWS)   │
└─────────────────┘       └──────────────────────┘       └──────────────────────┘       └──────────────────────┘
```

1. **Service**: Emits structured JSON events containing `ts`, `level`, `service`, `msg`, and request correlation `reqId`.
2. **Container Engine**: Docker captures `stdout` log streams.
3. **Log Agent**: Agents like Fluent Bit, Vector, CloudWatch Agent, or Promtail scrape container log streams.
4. **Cloud Storage & Indexing**: The cloud log service automatically parses top-level JSON fields into queryable index fields.

---

## 2. Field Mappings Across Cloud Providers

| JSON Field in Code | Purpose | Google Cloud Logging | Grafana Loki | AWS CloudWatch | Datadog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ts` | Timestamp | Automatically mapped to `timestamp` | Extracted as log timestamp | Standard `@timestamp` | Mapped to `date` |
| `level` | Severity Level | Mapped to `severity` (`INFO`, `WARNING`, `ERROR`) | Filterable label/field (`level="error"`) | Indexed field `level` | Mapped to `status` (`info`, `warn`, `error`) |
| `service` | Service Identifier | `resource.labels.container_name` or `jsonPayload.service` | Label `{app="orders-api"}` | Log Group / Stream name | Mapped to `service` facet |
| `reqId` | Correlation ID | `jsonPayload.reqId` | Parsed JSON key `reqId` | Filterable JSON key `reqId` | Filterable facet `reqId` |
| `msg` | Message Payload | `jsonPayload.msg` | `msg` key | `@message` or `msg` | `message` |

---

## 3. Searching and Incident Tracing in Cloud Tools

### A. Google Cloud Logging (Stackdriver)
When JSON logs are ingested by GCP Cloud Logging, top-level keys populate `jsonPayload`.

- **Filter by Error Severity**:
  ```sql
  resource.type="k8s_container"
  jsonPayload.service="orders-api"
  severity>=ERROR
  ```
- **Trace Single Request by Correlation ID**:
  ```sql
  jsonPayload.reqId="c3a8b417-814a-4d7a-8f55-7d5267bbf382"
  ```

### B. Grafana Loki
Loki uses LogQL to dynamically unpack JSON fields at query time without expensive pre-indexing.

- **Filter Errors**:
  ```logql
  {app="orders-api"} | json | level = "error"
  ```
- **Trace Full Journey of a Failing Request**:
  ```logql
  {app="orders-api"} | json | reqId = "c3a8b417-814a-4d7a-8f55-7d5267bbf382"
  ```

### C. AWS CloudWatch Logs Insights
AWS CloudWatch natively parses JSON strings into structured fields.

- **Trace Errors and Order Creation**:
  ```sql
  fields @timestamp, reqId, level, msg, statusCode, error
  | filter level = 'error' or reqId = 'c3a8b417-814a-4d7a-8f55-7d5267bbf382'
  | sort @timestamp desc
  | limit 100
  ```

---

## 4. Key Benefits of Structured Logging in Production

1. **Zero Indexing Friction**: JSON fields are auto-detected by modern agents without needing complex Regex parsing rules.
2. **Instant Correlation**: The `reqId` field bridges microservice boundaries, enabling end-to-end distributed tracing across service meshes.
3. **Alerting Automation**: Cloud platforms can configure automated alerts when `select(.level == "error")` count spikes over a threshold.
