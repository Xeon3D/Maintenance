#!/bin/sh
# Generates any missing secrets once (kept in $DATA_DIR/secrets.env so sessions and encrypted
# fields survive restarts), applies database migrations, then starts the server.
set -e

SECRETS="$DATA_DIR/secrets.env"
mkdir -p "$DATA_DIR" "$UPLOAD_DIR" "${BACKUP_DIR:-/backups}"
[ -f "$SECRETS" ] || { touch "$SECRETS"; chmod 600 "$SECRETS"; }

rand() { node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))"; }
keep() { # keep NAME VALUE — remember a generated value unless the variable is already set
  if [ -z "$(printenv "$1")" ] && ! grep -q "^$1=" "$SECRETS"; then echo "$1=$2" >> "$SECRETS"; fi
}
keep AUTH_SECRET "$(rand)"
keep FIELD_ENCRYPTION_KEY "$(rand)"
keep CRON_SECRET "$(rand)"
if [ -z "$VAPID_PUBLIC_KEY" ] && ! grep -q "^VAPID_PUBLIC_KEY=" "$SECRETS"; then
  # VAPID keys for web push: a P-256 key pair, public key as an uncompressed point (base64url).
  node -e "const {privateKey}=require('crypto').generateKeyPairSync('ec',{namedCurve:'prime256v1'});const j=privateKey.export({format:'jwk'});const b=(s)=>Buffer.from(s,'base64url');console.log('VAPID_PUBLIC_KEY='+Buffer.concat([Buffer.from([4]),b(j.x),b(j.y)]).toString('base64url')+'\nVAPID_PRIVATE_KEY='+j.d)" >> "$SECRETS"
fi

# Token shared with the updater (Watchtower) sidecar, which mounts $DATA_DIR read-only.
[ -s "$DATA_DIR/updater-token" ] || { rand > "$DATA_DIR/updater-token"; chmod 600 "$DATA_DIR/updater-token"; }

# Values from the environment win over the generated ones.
while IFS='=' read -r name value; do
  [ -n "$name" ] && [ -z "$(printenv "$name")" ] && export "$name=$value"
done < "$SECRETS"

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

echo "Applying database migrations…"
(cd /migrator && node node_modules/prisma/build/index.js migrate deploy)

exec "$@"
