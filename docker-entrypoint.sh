#!/bin/sh
set -eu

NODE_URL_VALUE="${NODE_URL:-http://localhost:3000}"
ESCAPED_NODE_URL=$(printf '%s' "$NODE_URL_VALUE" | sed "s/'/'\\''/g")

printf "window.__HIVE_CONFIG__ = { nodeUrl: '%s' }\n" "$ESCAPED_NODE_URL" > /www/runtime-config.js

exec "$@"
