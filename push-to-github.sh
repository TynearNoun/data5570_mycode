#!/usr/bin/env bash
# Push this repository to GitHub using a personal access token.
#
# The token is fed to git through GIT_ASKPASS, so it never lands in .git/config,
# in the process argv, or in a remote URL on disk. Provide it either in the
# GITHUB_TOKEN environment variable or at the (non-echoing) prompt.
#
#   ./push-to-github.sh            # push main
#   ./push-to-github.sh some-branch
set -euo pipefail

REPO_URL="https://github.com/TynearNoun/data5570_mycode.git"
USERNAME="${GITHUB_USERNAME:-TynearNoun}"
BRANCH="${1:-main}"

TOKEN="${GITHUB_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  if [[ -t 0 ]]; then
    read -rsp "GitHub personal access token for ${USERNAME}: " TOKEN
    echo
  else
    echo "Set GITHUB_TOKEN, or run this from an interactive terminal." >&2
    exit 1
  fi
fi

if [[ -z "$TOKEN" ]]; then
  echo "No token provided; nothing pushed." >&2
  exit 1
fi

askpass="$(mktemp)"
trap 'rm -f "$askpass"' EXIT
cat >"$askpass" <<'HELPER'
#!/usr/bin/env bash
case "$1" in
  *[Uu]sername*) printf '%s\n' "$GIT_PUSH_USERNAME" ;;
  *[Pp]assword*) printf '%s\n' "$GIT_PUSH_TOKEN" ;;
esac
HELPER
chmod 700 "$askpass"

echo "Pushing ${BRANCH} to ${REPO_URL}"
GIT_ASKPASS="$askpass" \
GIT_PUSH_USERNAME="$USERNAME" \
GIT_PUSH_TOKEN="$TOKEN" \
GIT_TERMINAL_PROMPT=0 \
  git push "$REPO_URL" "${BRANCH}:${BRANCH}"

echo "Done. https://github.com/TynearNoun/data5570_mycode"
