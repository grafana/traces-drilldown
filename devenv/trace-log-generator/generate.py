#!/usr/bin/env python3
"""
Emits traces to Tempo and matching logs to Loki, correlated by trace id.

The mythical-beasts services in this devenv produce traces but no usable logs, so there is nothing
to exercise trace to logs against. This generator fills that gap deterministically: every trace it
writes belongs to a *flavour* that reproduces one real world log shape, so each of the query shapes
the app probes for (`src/tracesToLogs/strategies.ts`) has something to match, and one flavour
deliberately has no logs at all so the "show nothing rather than a dead link" path is covered too.

Standard library only, so the container needs no build step.
"""

import json
import os
import random
import time
import urllib.error
import urllib.request

TEMPO_OTLP_HTTP = os.environ.get("TEMPO_OTLP_HTTP", "http://tempo:4318")
LOKI_URL = os.environ.get("LOKI_URL", "http://loki:3100")
INTERVAL_SECONDS = float(os.environ.get("INTERVAL_SECONDS", "5"))

# Flavours rotate so that, at any point, recent traces cover every case.
#
#   strategy         what the logs look like
#   ---------------- ---------------------------------------------------------------------------
#   otel             service_name stream label, trace id as structured metadata (Loki 3.x default)
#   service-json     service_name stream label, trace id inside a json line (no metadata). Seen on
#                    real Grafana Cloud stacks where the app writes json and the collector only
#                    attaches resource labels.
#   otlp-gateway     exporter/job stream labels, json line with a `traceid` field (legacy gateway)
#   job-logfmt       job stream label, logfmt line with a `trace_id` key
#   line-only        service_name stream label, trace id only present in the raw line
#   silent           no logs at all, so no link should be offered for these traces
FLAVOURS = [
    {"name": "otel", "services": ["checkout", "cart"]},
    {"name": "service-json", "services": ["payments", "shipping"]},
    {"name": "otlp-gateway", "services": ["basket", "billing"]},
    {"name": "job-logfmt", "services": ["warehouse"]},
    {"name": "line-only", "services": ["legacy-worker"]},
    {"name": "silent", "services": ["ghost-service"]},
]

OPERATIONS = ["GET /api/order", "POST /api/checkout", "GET /api/inventory"]


def hex_id(length: int) -> str:
    return "".join(random.choice("0123456789abcdef") for _ in range(length))


def post(url: str, payload: dict) -> None:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=10) as response:
        response.read()


def build_trace(trace_id: str, services: list, start_ns: int) -> dict:
    """One root span per service, chained parent to child, a few hundred ms apart."""
    resource_spans = []
    parent_span_id = None
    offset_ns = 0

    for index, service in enumerate(services):
        span_id = hex_id(16)
        duration_ns = random.randint(20, 400) * 1_000_000
        span = {
            "traceId": trace_id,
            "spanId": span_id,
            "name": OPERATIONS[index % len(OPERATIONS)],
            "kind": 2,
            "startTimeUnixNano": str(start_ns + offset_ns),
            "endTimeUnixNano": str(start_ns + offset_ns + duration_ns),
            "attributes": [
                {"key": "http.request.method", "value": {"stringValue": "GET"}},
                {"key": "http.response.status_code", "value": {"intValue": "200"}},
            ],
            "status": {"code": 1},
        }

        if parent_span_id:
            span["parentSpanId"] = parent_span_id

        resource_spans.append(
            {
                "resource": {
                    "attributes": [
                        {"key": "service.name", "value": {"stringValue": service}},
                        {"key": "service.namespace", "value": {"stringValue": "shop"}},
                        {"key": "deployment.environment", "value": {"stringValue": "devenv"}},
                    ]
                },
                "scopeSpans": [
                    {"scope": {"name": "devenv-trace-log-generator"}, "spans": [span]}
                ],
            }
        )

        parent_span_id = span_id
        offset_ns += duration_ns

    return {"resourceSpans": resource_spans}


def build_log_streams(flavour: str, services: list, trace_id: str, timestamp_ns: int) -> list:
    streams = []

    for service in services:
        if flavour == "otel":
            streams.append(
                {
                    "stream": {"service_name": service, "service_namespace": "shop"},
                    "values": [
                        [
                            str(timestamp_ns),
                            f'level=info service={service} msg="handled request"',
                            {"trace_id": trace_id},
                        ]
                    ],
                }
            )
        elif flavour == "service-json":
            line = json.dumps(
                {
                    "message": "handled request",
                    "severity": "info",
                    "service": service,
                    "trace_id": trace_id,
                }
            )
            streams.append(
                {
                    "stream": {"service_name": service, "namespace": "shop"},
                    "values": [[str(timestamp_ns), line]],
                }
            )
        elif flavour == "otlp-gateway":
            line = json.dumps(
                {
                    "body": "handled request",
                    "severity": "info",
                    "traceid": trace_id,
                    "service": service,
                }
            )
            streams.append(
                {
                    "stream": {"exporter": "OTLP", "job": f"shop/{service}"},
                    "values": [[str(timestamp_ns), line]],
                }
            )
        elif flavour == "job-logfmt":
            streams.append(
                {
                    "stream": {"job": f"shop/{service}"},
                    "values": [
                        [
                            str(timestamp_ns),
                            f'level=info trace_id={trace_id} msg="handled request"',
                        ]
                    ],
                }
            )
        elif flavour == "line-only":
            streams.append(
                {
                    "stream": {"service_name": service},
                    "values": [
                        [
                            str(timestamp_ns),
                            f"handled request for trace {trace_id} in {service}",
                        ]
                    ],
                }
            )

    return streams


def main() -> None:
    print(
        f"generating traces to {TEMPO_OTLP_HTTP} and logs to {LOKI_URL} "
        f"every {INTERVAL_SECONDS}s",
        flush=True,
    )

    index = 0

    while True:
        flavour = FLAVOURS[index % len(FLAVOURS)]
        index += 1

        trace_id = hex_id(32)
        now_ns = time.time_ns()

        try:
            post(f"{TEMPO_OTLP_HTTP}/v1/traces", build_trace(trace_id, flavour["services"], now_ns))

            streams = build_log_streams(flavour["name"], flavour["services"], trace_id, now_ns)

            if streams:
                post(f"{LOKI_URL}/loki/api/v1/push", {"streams": streams})

            print(f"{flavour['name']:<13} {trace_id}", flush=True)
        except (urllib.error.URLError, urllib.error.HTTPError, OSError) as error:
            print(f"failed to emit {flavour['name']} telemetry: {error}", flush=True)

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
