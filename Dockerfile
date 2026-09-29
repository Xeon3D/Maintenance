# VillaOps CMMS — production image (Next.js standalone server + Prisma migrations).
# Build: docker build -t maintenance .   Run: see docker-compose.yml

FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── Dependencies (postinstall runs `prisma generate`, which needs the schema)
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ── Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ── Prisma CLI for `migrate deploy` at start-up (kept apart from the traced app bundle)
FROM base AS migrator
WORKDIR /migrator
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund prisma@7.10.0 dotenv@18.0.4

# ── Runtime
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data \
    UPLOAD_DIR=/data/uploads \
    AUTH_TRUST_HOST=true \
    SCHEDULER_INTERVAL_MINUTES=15 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=migrator /migrator/node_modules /migrator/node_modules
COPY prisma /migrator/prisma
COPY prisma.config.ts /migrator/
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && mkdir -p /data/uploads && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
