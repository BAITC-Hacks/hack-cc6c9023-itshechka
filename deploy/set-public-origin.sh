#!/bin/sh
set -eu

origin="${1:?Pass the public site origin, for example https://example.com}"
case "$origin" in
  http://*|https://*) ;;
  *) echo "Origin must begin with http:// or https://" >&2; exit 2 ;;
esac

test -f .env
sed -i \
  -e "s|^FRONTEND_URL=.*|FRONTEND_URL=$origin|" \
  -e "s|^PUBLIC_API_URL=.*|PUBLIC_API_URL=$origin/api/v1|" \
  -e "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$origin/api/v1|" \
  .env
chmod 600 .env
echo "Updated public origin in private Compose environment"
