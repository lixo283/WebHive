#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
ENV_FILE="$BACKEND_DIR/.env"
SCHEMA_FILE="$ROOT_DIR/database/schema.sql"
SEED_FILE="$ROOT_DIR/database/seed.sql"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-webstudio}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
APP_PORT="${PORT:-3000}"
JWT_SECRET="${JWT_SECRET:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Command not found: $1"
    exit 1
  fi
}

generate_jwt_secret() {
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

ensure_jwt_secret() {
  local current_secret
  current_secret="$(sed -n 's/^JWT_SECRET=//p' "$ENV_FILE" | head -n 1)"
  if [ "${#current_secret}" -ge 32 ] \
    && [ "$current_secret" != "change_me_super_secret" ] \
    && [ "$current_secret" != "replace-with-at-least-32-random-characters" ]; then
    return
  fi

  current_secret="$(generate_jwt_secret)"
  if grep -q '^JWT_SECRET=' "$ENV_FILE"; then
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$current_secret/" "$ENV_FILE"
  else
    printf 'JWT_SECRET=%s\n' "$current_secret" >> "$ENV_FILE"
  fi
  echo "Generated a local JWT secret in backend/.env."
}

echo "[1/6] Checking required commands..."
require_cmd node
require_cmd npm
require_cmd psql

if [ ! -f "$ENV_FILE" ]; then
  echo "[2/6] Creating backend/.env from defaults..."
  JWT_SECRET="${JWT_SECRET:-$(generate_jwt_secret)}"
  cat > "$ENV_FILE" <<ENV
PORT=$APP_PORT
DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
JWT_SECRET=$JWT_SECRET
CORS_ORIGIN=http://localhost:8080,http://localhost:$APP_PORT
ENV
else
  echo "[2/6] backend/.env already exists (keeping existing file)."
fi
ensure_jwt_secret

echo "[3/6] Installing backend dependencies (if needed)..."
cd "$BACKEND_DIR"
if [ ! -d node_modules ]; then
  npm install
else
  echo "node_modules already present, skipping npm install"
fi

echo "[4/6] Checking PostgreSQL connection..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
  echo "[ERROR] Cannot connect to PostgreSQL with provided credentials."
  echo "Check DB_HOST/DB_PORT/DB_USER/DB_PASSWORD and that PostgreSQL is running."
  exit 1
fi

echo "[5/6] Ensuring database '$DB_NAME' exists..."
DB_EXISTS="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" | tr -d '[:space:]')"
if [ "$DB_EXISTS" != "1" ]; then
  PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
  echo "Database '$DB_NAME' created."
else
  echo "Database '$DB_NAME' already exists."
fi

echo "[6/6] Applying schema and starting backend..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE" >/dev/null
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEED_FILE" >/dev/null

echo ""
echo "Backend will run at: http://localhost:$APP_PORT"
echo "Frontend is served by backend static files."
echo "Press Ctrl+C to stop."
echo ""

npm run dev
