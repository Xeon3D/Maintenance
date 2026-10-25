# Domusly CMMS — production image (Next.js standalone server + Prisma migrations).
# Build: docker build -t maintenance .   Run: see docker-compose.yml

FROM node:24.22.1-trixie-slim AS base
# Debian security updates (openssl, util-linux, perl…) on every build; the release workflow skips the cache here.
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
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
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund prisma@7.10.1 dotenv@18.0.4

# ── ffmpeg for video uploads (lib/video.ts), built with only what the app uses: every built-in decoder and
# demuxer (any phone video), libdav1d for AV1, libx264 + AAC + MJPEG encoders, MP4/JPEG output. Debian's own
# ffmpeg package pulls in ~150 libraries (X11, Mesa, LLVM, audio servers…) that only add vulnerabilities.
# Update FFMPEG_VERSION and FFMPEG_SHA256 together (sha256 of the .tar.xz from ffmpeg.org/releases, whose
# .asc signature is checked against the FFmpeg release key FCF9 86EA 15E6 E293 A564 4F10 B432 2F04 D676 58D8).
FROM debian:trixie-slim AS ffmpeg
ARG FFMPEG_VERSION=7.1.5
ARG FFMPEG_SHA256=de668509caf9e35e3cd162473441fdb29538c6d96ed080292b3cf9e6fc5d558f
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl xz-utils build-essential nasm pkg-config libx264-dev libdav1d-dev \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN curl -fsSL -o ffmpeg.tar.xz "https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz" \
 && echo "${FFMPEG_SHA256}  ffmpeg.tar.xz" | sha256sum -c - \
 && tar -xJf ffmpeg.tar.xz --strip-components=1 \
 && ./configure --prefix=/opt/ffmpeg --enable-gpl --enable-libx264 --enable-libdav1d \
      --disable-autodetect --disable-network --disable-debug --disable-doc --disable-ffplay \
      --disable-devices --disable-hwaccels \
      --disable-encoders --enable-encoder=libx264,aac,mjpeg \
      --disable-muxers --enable-muxer=mp4,mov,image2 \
 && make -j"$(nproc)" && make install && strip /opt/ffmpeg/bin/*

# ── Runtime
FROM base AS runner
# PostgreSQL 18 client tools (pg_dump/pg_restore/psql) for backups; they work with servers up to 18.
# libx264 / libdav1d for the ffmpeg built above.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt trixie-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y --no-install-recommends postgresql-client-18 libx264-164 libdav1d7 \
 && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
# The server runs with plain `node`; drop npm/npx/corepack/yarn so their bundled packages (undici,
# brace-expansion…) aren't shipped.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV NODE_ENV=production \
    APP_RUNTIME=docker \
    BACKUP_DIR=/backups \
    MIGRATIONS_DIR=/migrator/prisma/migrations \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data \
    UPLOAD_DIR=/data/uploads \
    AUTH_TRUST_HOST=true \
    SCHEDULER_INTERVAL_MINUTES=15 \
    NEXT_TELEMETRY_DISABLED=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=ffmpeg /opt/ffmpeg/bin/ffmpeg /opt/ffmpeg/bin/ffprobe /usr/local/bin/
COPY --from=migrator /migrator/node_modules /migrator/node_modules
COPY prisma /migrator/prisma
COPY prisma.config.ts /migrator/
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && mkdir -p /data/uploads /backups && chown -R node:node /data /backups
USER node
VOLUME ["/data", "/backups"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
