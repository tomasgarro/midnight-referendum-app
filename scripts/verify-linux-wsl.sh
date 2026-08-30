#!/usr/bin/env bash
# Run scripts/verify-linux.sh inside WSL with a working Linux toolchain.
#
# Invoke from Git Bash on Windows as:
#   MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash scripts/verify-linux-wsl.sh demo
#
# Three things this exists to get right, each of which failed a run before it
# was written:
#
#   1. `bash -lc` is a login shell and does not source ~/.bashrc, so nvm never
#      loads, `node` resolves to nothing, and the Windows npm on WSL's
#      interpolated PATH wins. verify-linux.sh then reports "Windows npm leaked
#      into WSL PATH", which reads like a PATH bug but means "nvm never loaded".
#   2. Dropping /mnt/c from PATH to fix (1) also drops the Compact compiler,
#      which lives in ~/.local/bin and is absent from a non-login PATH.
#   3. This file must keep LF endings. With CRLF, `set -Eeuo pipefail` dies as
#      "set: pipefail: invalid option name" -- the same trap .husky hits as
#      "Illegal option". See .gitattributes.
#
# Do not pipe this into `tail`: the pipeline exit status would be tail's, and a
# failed gate would look like a pass. Redirect to a file and check $? instead.
set -Eeuo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
command -v nvm >/dev/null 2>&1 && nvm use 22 >/dev/null

# Nothing under /mnt/c may win a PATH lookup: verify-linux.sh fails closed if a
# Windows Node or npm is visible, and it is right to.
PATH="$(printf '%s' "$PATH" | tr ':' '
' | grep -v '^/mnt/c' | paste -sd: -)"
export PATH="$HOME/.local/bin:$PATH"

printf 'node:    %s %s
' "$(command -v node)" "$(node --version 2>/dev/null)"
printf 'npm:     %s %s
' "$(command -v npm)" "$(npm --version 2>/dev/null)"
printf 'compact: %s %s
' "$(command -v compact)" "$(compact compile --version 2>/dev/null)"
printf '
'

cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
exec bash scripts/verify-linux.sh "${1:-demo}"
