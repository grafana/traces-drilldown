#!/bin/sh
set -eu

host="${GRAFANA_HOST:-grafana}"
port="${GRAFANA_PORT:-3000}"
max_attempts="${MAX_ATTEMPTS:-90}"

echo "Waiting for ${host} DNS..."
attempt=0
while [ "$attempt" -lt "$max_attempts" ]; do
  if getent hosts "$host" >/dev/null 2>&1; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done
if ! getent hosts "$host" >/dev/null 2>&1; then
  echo "Timed out waiting for ${host} DNS" >&2
  exit 1
fi

echo "Waiting for http://${host}:${port}/api/health ..."
attempt=0
while [ "$attempt" -lt "$max_attempts" ]; do
  if curl -sf "http://${host}:${port}/api/health" >/dev/null; then
    echo "Grafana is ready"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 2
done

echo "Timed out waiting for Grafana at http://${host}:${port}/api/health" >&2
exit 1
