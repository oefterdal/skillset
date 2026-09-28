#!/bin/sh
set -eu

repo=oefterdal/skillset
api="https://api.github.com/repos/$repo/releases/latest"

fail() {
  printf '%s\n' "Error: $*" >&2
  exit 1
}

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)
[ "$arch" = x86_64 ] && arch=x64
[ "$arch" = aarch64 ] && arch=arm64
case "$os-$arch" in
  darwin-x64|darwin-arm64) platform="macOS $arch" ;;
  linux-x64|linux-arm64) platform="Linux $arch" ;;
  *) fail "unsupported platform: $os-$arch" ;;
esac

if [ -n "${SKILLSET_VERSION:-}" ]; then
  version=$SKILLSET_VERSION
else
  release=$(curl -fsSL "$api") || fail "could not determine the latest Skillset release"
  version=$(printf '%s\n' "$release" | sed -n 's/^[[:space:]]*"tag_name": "\([^"]*\)".*/\1/p' | head -n 1)
  [ -n "$version" ] || fail "could not determine the latest Skillset version"
fi

file="skillset-$os-$arch"
checksum="$file.sha256"
base="https://github.com/$repo/releases/download/$version"
bin=${SKILLSET_INSTALL_DIR:-"$HOME/.local/bin"}
tmp=$(mktemp -d) || fail "could not create a temporary directory"
trap 'rm -rf "$tmp"' EXIT HUP INT TERM

printf 'Installing Skillset %s...\n\n' "$version"
printf '✓ Detected %s\n' "$platform"

mkdir -p "$bin" || fail "could not create installation directory: $bin"
curl -fsSL "$base/$file" -o "$tmp/$file" || fail "could not download Skillset"
curl -fsSL "$base/$checksum" -o "$tmp/$checksum" || fail "could not download the checksum"

if command -v sha256sum >/dev/null 2>&1; then
  if ! (cd "$tmp" && sha256sum -c "$checksum" >/dev/null); then
    fail "checksum verification failed"
  fi
else
  expected=$(awk '{print $1}' "$tmp/$checksum")
  actual=$(shasum -a 256 "$tmp/$file" | awk '{print $1}')
  [ "$expected" = "$actual" ] || fail "checksum verification failed"
fi
printf '✓ Downloaded and verified\n'

install -m 755 "$tmp/$file" "$bin/skillset" || fail "could not install Skillset to $bin/skillset"
printf '✓ Installed to %s\n' "$bin/skillset"

case ":$PATH:" in
  *":$bin:"*) ;;
  *)
    printf '\n%s is not currently on your PATH.\n\nAdd it with:\n\n  export PATH="%s:$PATH"\n' "$bin" "$bin"
    ;;
esac
printf '\nRun `skillset --help` to get started.\n'
