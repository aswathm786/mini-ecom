#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <on|off> [message]" >&2
  exit 1
fi

STATE="$1"
MESSAGE="${2:-'We are performing scheduled maintenance and will be back shortly.'}"

if [[ "${STATE}" != "on" && "${STATE}" != "off" ]]; then
  echo "First argument must be 'on' or 'off'" >&2
  exit 1
fi

API_URL="${API_URL:-http://localhost:4000/api}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

if [[ -z "${ADMIN_TOKEN}" ]]; then
  echo "Set ADMIN_TOKEN environment variable to an admin JWT" >&2
  exit 1
fi

ENABLED="false"
if [[ "${STATE}" == "on" ]]; then
  ENABLED="true"
fi

curl -X PATCH "${API_URL}/admin/settings/path" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"maintenance\",\"value\":{\"enabled\":${ENABLED},\"message\":\"${MESSAGE}\"}}"

echo ""
echo "✅ Maintenance mode ${STATE}"

