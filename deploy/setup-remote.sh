#!/bin/sh
set -eu

site_host="${1:?Pass the public server IP or hostname}"
site_port="${2:-3001}"

if [ -e .env ]; then
  echo "Existing .env retained"
  exit 0
fi

umask 077
db_password="$(openssl rand -hex 24)"
jwt_secret="$(openssl rand -hex 32)"

cat > .env <<EOF
COMPOSE_PROJECT_NAME=hackalem
POSTGRES_PASSWORD=$db_password
JWT_SECRET=$jwt_secret
SITE_PORT=$site_port
FRONTEND_URL=http://$site_host:$site_port
PUBLIC_API_URL=http://$site_host:$site_port/api/v1
NEXT_PUBLIC_API_URL=http://$site_host:$site_port/api/v1
EOF

chmod 600 .env
echo "Created private Compose environment"
