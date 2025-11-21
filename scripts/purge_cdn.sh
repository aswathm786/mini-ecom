#!/bin/bash

# CDN Purge Script
# Purges CDN cache for configured provider

set -e

CDN_PROVIDER="${CDN_PROVIDER:-cloudflare}"
CDN_API_KEY="${CDN_API_KEY:-}"
CDN_ZONE_ID="${CDN_ZONE_ID:-}"

if [ -z "${CDN_API_KEY}" ] || [ -z "${CDN_ZONE_ID}" ]; then
  echo "Error: CDN_API_KEY and CDN_ZONE_ID must be set"
  exit 1
fi

echo "Purging CDN cache (${CDN_PROVIDER})..."

case "${CDN_PROVIDER}" in
  cloudflare)
    # Purge everything
    curl -X POST "https://api.cloudflare.com/client/v4/zones/${CDN_ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CDN_API_KEY}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
    ;;
  aws)
    # AWS CloudFront invalidation
    DISTRIBUTION_ID="${CDN_DISTRIBUTION_ID:-}"
    if [ -z "${DISTRIBUTION_ID}" ]; then
      echo "Error: CDN_DISTRIBUTION_ID must be set for AWS"
      exit 1
    fi
    aws cloudfront create-invalidation \
      --distribution-id "${DISTRIBUTION_ID}" \
      --paths "/*"
    ;;
  *)
    echo "Error: Unsupported CDN provider: ${CDN_PROVIDER}"
    exit 1
    ;;
esac

echo "CDN cache purge initiated successfully"
