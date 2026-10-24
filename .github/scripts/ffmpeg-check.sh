#!/usr/bin/env bash
# Compares the ffmpeg the Docker image builds (Dockerfile: FFMPEG_VERSION) with the releases on ffmpeg.org.
# Vulnerability scanners don't see a self-built ffmpeg, so this is how we hear about its security releases.
# On a newer release of the same branch (e.g. 7.1.5 -> 7.1.6) it verifies the tarball's signature, prints the new
# FFMPEG_VERSION / FFMPEG_SHA256 lines and exits 1. Exits 0 when up to date.
# Usage: .github/scripts/ffmpeg-check.sh [Dockerfile]   (writes a summary to $GITHUB_STEP_SUMMARY when set)
set -euo pipefail

DOCKERFILE=${1:-Dockerfile}
# FFmpeg release signing key (https://ffmpeg.org/download.html#releases).
KEY_FPR=FCF986EA15E6E293A5644F10B4322F04D67658D8
SUMMARY=${GITHUB_STEP_SUMMARY:-/dev/stdout}

current=$(sed -n 's/^ARG FFMPEG_VERSION=//p' "$DOCKERFILE")
[ -n "$current" ] || { echo "FFMPEG_VERSION not found in $DOCKERFILE" >&2; exit 2; }
branch=$(echo "$current" | cut -d. -f1,2)

releases=$(curl -fsSL https://ffmpeg.org/releases/ | grep -oE 'ffmpeg-[0-9]+(\.[0-9]+)*\.tar\.xz"' | sed 's/^ffmpeg-//; s/\.tar\.xz"$//' | sort -uV)
latest=$(echo "$releases" | grep -E "^${branch//./\\.}(\.[0-9]+)?$" | tail -1)
newest=$(echo "$releases" | tail -1)

if [ "$(printf '%s\n%s\n' "$current" "$latest" | sort -V | tail -1)" = "$current" ]; then
  echo "ffmpeg $current is the latest $branch release (newest overall: $newest)."
  exit 0
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
curl -fsSL -o "$work/ffmpeg.tar.xz" "https://ffmpeg.org/releases/ffmpeg-$latest.tar.xz"
curl -fsSL -o "$work/ffmpeg.tar.xz.asc" "https://ffmpeg.org/releases/ffmpeg-$latest.tar.xz.asc"
curl -fsSL -o "$work/key.asc" https://ffmpeg.org/ffmpeg-devel.asc
export GNUPGHOME="$work/gnupg"
mkdir -m 700 "$GNUPGHOME"
gpg --batch --quiet --import "$work/key.asc"
gpg --batch --status-fd 1 --verify "$work/ffmpeg.tar.xz.asc" "$work/ffmpeg.tar.xz" 2>/dev/null | grep -q "VALIDSIG $KEY_FPR" \
  || { echo "Signature check failed for ffmpeg-$latest.tar.xz" >&2; exit 2; }
sha=$(sha256sum "$work/ffmpeg.tar.xz" | cut -d' ' -f1)

cat >> "$SUMMARY" <<EOF
## ffmpeg $latest is out (the image builds $current)

The tarball's signature checks out against the FFmpeg release key. Put these two lines in the Dockerfile's \`ffmpeg\` stage,
then release a new version:

\`\`\`
ARG FFMPEG_VERSION=$latest
ARG FFMPEG_SHA256=$sha
\`\`\`

Changes: https://git.ffmpeg.org/gitweb/ffmpeg.git/shortlog/n$latest · security fixes: https://ffmpeg.org/security.html
(Newest release overall: $newest.)
EOF
echo "ffmpeg $latest is available (the image builds $current)." >&2
exit 1
