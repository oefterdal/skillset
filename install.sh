#!/bin/sh
set -eu
repo=oefterdal/skillset
os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m); [ "$arch" = x86_64 ] && arch=x64; [ "$arch" = aarch64 ] && arch=arm64
case "$os-$arch" in linux-x64|linux-arm64|darwin-x64|darwin-arm64) ;; *) echo "Unsupported platform: $os-$arch" >&2; exit 1;; esac
tag=${SKILLSET_VERSION:-latest}; base="https://github.com/$repo/releases/${tag}/download"; file="skillset-$os-$arch"; checksum="$file.sha256"
bin=${SKILLSET_INSTALL_DIR:-"$HOME/.local/bin"}; mkdir -p "$bin"; tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$base/$file" -o "$tmp/$file"; curl -fsSL "$base/$checksum" -o "$tmp/$checksum"
if command -v sha256sum >/dev/null 2>&1; then (cd "$tmp" && sha256sum -c "$checksum"); else expected=$(awk '{print $1}' "$tmp/$checksum"); actual=$(shasum -a 256 "$tmp/$file" | awk '{print $1}'); [ "$expected" = "$actual" ]; fi || { echo "Checksum verification failed" >&2; exit 1; }
install -m 755 "$tmp/$file" "$bin/skillset"
case ":$PATH:" in *":$bin:"*) ;; *) echo "Installed to $bin; add it to PATH." >&2;; esac
