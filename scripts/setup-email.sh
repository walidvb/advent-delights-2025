#!/usr/bin/env bash
#
# Email sending setup. Walks a human through the parts of it that only a human
# can do: making a Resend account, adding DNS records to the sending domain,
# and reading a test message in a real inbox. Captures the API key into
# .dev.vars (local) and `wrangler secret put` (deployed), and never prints it.
#
#     ./scripts/setup-email.sh
#
# Safe to re-run. Existing values are offered back as defaults and an existing
# Worker secret is left alone unless you say to overwrite it.
#
# LOCAL DEV NEEDS NONE OF THIS. The contract, which ticket 06 relies on:
# src/lib/email.ts is the only thing that sends mail, and when RESEND_API_KEY
# is absent it writes the message to the server console and reports success.
# So `npm run dev` works with no account, no domain and no key — you read the
# Curator's six-digit sign-in code out of the terminal.
#
# Everything above the "STAGES" marker is the wizard library from the /wizard
# skill: do not hand-edit it. The stages are below the marker.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# Wizard library: delightful, consistent UX, identical across every wizard.
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

# Author sets this at the top of the stages section.
TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()    # KEYs written to ENV_FILE this run
WRITTEN_SECRET=() # secret NAMEs set this run
SKIPPED=()        # things we couldn't do (e.g. gh missing)

# _clear wipes the terminal so only the current step is on screen. No-op when
# output isn't a terminal, so piped logs stay readable.
_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

# banner "Title" shows the opening frame: what this wizard does.
banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later, since it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

# stage "Name" clears the screen, then announces a stage and shows progress.
# Clearing keeps only the current step on screen.
stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

# say "..." prints a plain instruction line.
say()  { printf '  %s\n' "$1"; }
# step "..." is a numbered-feeling action the human takes in the browser.
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

# open_url URL opens it in the human's browser, cross-platform incl. WSL.
open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else warn "couldn't open a browser; visit it manually: $url"; fi
  } >/dev/null 2>&1 || warn "couldn't open a browser, so visit it manually: $url"
}

# pause "msg" waits for the human to confirm they've done the manual part.
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

# confirm "question" is a y/N gate; returns success on yes.
confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# _existing KEY: current value of KEY in ENV_FILE, if any.
_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

# ask KEY "Prompt" reads a value into $KEY. Offers the existing .env value as
# a default on re-runs (Enter keeps it). Visible input (non-secret).
ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret KEY "Prompt" is like ask, but input is hidden.
ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || true
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# write_env KEY VALUE upserts KEY=VALUE into ENV_FILE (creates it; replaces
# any existing line). Idempotent.
write_env() {
  local key="$1" value="$2" tmp
  touch "$ENV_FILE"
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

# set_secret NAME VALUE sets a GitHub Actions repo secret via gh. Falls back
# to a warning (and records it) if gh is unavailable or unauthenticated.
set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name: gh not ready; set it later"
}

# set_var NAME VALUE sets a GitHub Actions repo variable (non-secret).
set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name, gh not ready; set it later"
}

# finish clears, then shows a closing summary of everything configured.
finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}


# ──────────────────────────────────────────────────────────────────────────
# STAGES
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=7

# Local dev secrets live in .dev.vars (wrangler/miniflare read it, and so does
# `next dev` via initOpenNextCloudflareForDev). Never .env — nothing here reads
# that.
ENV_FILE=".dev.vars"

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_ROOT"

# ── helpers ───────────────────────────────────────────────────────────────

# The library's WRITTEN_SECRET is for GitHub secrets, which we don't use.
PUT_ON_WORKER=""

# resend_get PATH / resend_post PATH BODY: call the Resend API with the key
# fed to curl over stdin, so it never appears in argv (visible in `ps`) and is
# never printed. Body of the response goes to stdout; failures return nonzero.
resend_get() {
  printf 'header = "Authorization: Bearer %s"\n' "${RESEND_API_KEY:-}" |
    curl -sS --config - "https://api.resend.com$1"
}

resend_post() {
  printf 'header = "Authorization: Bearer %s"\n' "${RESEND_API_KEY:-}" |
    curl -sS --config - -X POST "https://api.resend.com$1" \
      -H "Content-Type: application/json" --data "$2"
}

# domain_status DOMAIN: prints Resend's verification status for the domain, or
# "unknown" when we can't read it (no jq, API error). Never fatal.
domain_status() {
  local json
  command -v jq >/dev/null 2>&1 || { printf 'unknown'; return; }
  json=$(resend_get "/domains" 2>/dev/null) || { printf 'unknown'; return; }
  printf '%s' "$json" |
    jq -r --arg d "$1" 'try (.data[] | select(.name == $d) | .status) // "absent"' 2>/dev/null |
    head -n1 | grep . || printf 'absent'
}

# worker_has_secret NAME: true when the deployed Worker already holds it.
worker_has_secret() {
  npx --no-install wrangler secret list 2>/dev/null | grep -q -- "$1"
}

# worker_put_secret NAME VALUE: pipes the value to `wrangler secret put` (never
# on the command line). Records a to-do instead of failing when the Worker
# isn't deployed yet or wrangler isn't logged in — ticket 01's deploy may not
# have happened.
worker_put_secret() {
  if printf '%s' "$2" | npx --no-install wrangler secret put "$1" >/dev/null 2>&1; then
    PUT_ON_WORKER="$PUT_ON_WORKER $1"
    printf '  %s✓ set%s Worker secret %s\n' "$GREEN" "$RESET" "$1"
  else
    SKIPPED+=("Worker secret $1 (deploy first, then: npx wrangler secret put $1)")
    warn "couldn't set Worker secret $1 — is the Worker deployed and wrangler logged in?"
  fi
}

# ── preflight: refuse to run if .dev.vars could be committed ──────────────

if ! git check-ignore -q "$ENV_FILE" 2>/dev/null; then
  printf '\n  %s✗ %s is not gitignored.%s\n' "$RED" "$ENV_FILE" "$RESET"
  printf '    Add a line "%s*" to .gitignore and re-run. Refusing to write a\n' "$ENV_FILE"
  printf '    secret to a file git would track.\n\n'
  exit 1
fi

banner "Email sending setup — Resend"

# ── 1 ─────────────────────────────────────────────────────────────────────
stage "Resend account"
say "Sending the Curator sign-in code needs one email provider. We use Resend:"
say "free for 3,000 messages a month, and a plain HTTPS API, so the Worker"
say "needs no npm package to send mail."
printf '\n'
open_url "https://resend.com/signup"
step "Sign up (GitHub sign-in is quickest). No card is asked for."
step "Confirm the address Resend emails you — nothing else works until you do."
note "Already have an account? Just sign in; this stage changes nothing."
pause "Signed in to Resend?"

# ── 2 ─────────────────────────────────────────────────────────────────────
stage "Sending domain"
say "Resend will only send from a domain you have proven you control."
printf '\n'
ask EMAIL_DOMAIN "Domain you'll send from (e.g. advent.example):"
if [[ -z "${EMAIL_DOMAIN:-}" ]]; then
  warn "a domain is required; re-run when you have one."
  exit 1
fi
write_env EMAIL_DOMAIN "$EMAIL_DOMAIN"
printf '\n'
open_url "https://resend.com/domains"
step "Click 'Add Domain'."
step "Enter: $EMAIL_DOMAIN"
step "Pick the region closest to you and click Add."
printf '\n'
ask EMAIL_REGION "Which region did you pick? (us-east-1 / eu-west-1 / sa-east-1 / ap-northeast-1):"
[[ -n "${EMAIL_REGION:-}" ]] || EMAIL_REGION="us-east-1"
write_env EMAIL_REGION "$EMAIL_REGION"
pause "Domain added?"

# ── 3 ─────────────────────────────────────────────────────────────────────
stage "DNS records"
say "Resend is now showing you a table of records. Add these at your DNS host,"
say "exactly as written. Hosts are given relative to $EMAIL_DOMAIN — if your DNS"
say "panel wants the full name, append .$EMAIL_DOMAIN"
printf '\n'
printf '  %sTYPE  HOST                 VALUE%s\n' "$BOLD" "$RESET"
printf '  MX    send                 feedback-smtp.%s.amazonses.com   (priority 10)\n' "$EMAIL_REGION"
printf '  TXT   send                 v=spf1 include:amazonses.com ~all\n'
printf '  TXT   resend._domainkey    p=<the long key on the Resend page>\n'
printf '  TXT   _dmarc               v=DMARC1; p=none;\n'
printf '\n'
warn "The DKIM value (p=...) is generated per domain — only Resend can show it."
note "Copy it from the Resend page you have open; it is the one value this"
note "script cannot print for you. The _dmarc record is optional but keeps"
note "mailbox providers happy."
printf '\n'
open_url "https://resend.com/domains"
step "Add all four records at your DNS host, then come back."
pause "Records added? (propagation can take a few minutes)"

# ── 4 ─────────────────────────────────────────────────────────────────────
stage "API key"
open_url "https://resend.com/api-keys"
step "Click 'Create API Key'."
step "Name it 'advent', permission 'Sending access', domain $EMAIL_DOMAIN."
step "Copy the key — Resend shows it exactly once."
printf '\n'
note "Your paste is hidden and is never echoed back."
ask_secret RESEND_API_KEY "Paste the API key (re_...):"
if [[ -z "${RESEND_API_KEY:-}" ]]; then
  warn "no key given; re-run when you have one."
  exit 1
fi
write_env RESEND_API_KEY "$RESEND_API_KEY"
printf '\n'
say "Mail will be sent from this address. It must be at $EMAIL_DOMAIN."
ask EMAIL_FROM "From address [advent@$EMAIL_DOMAIN]:"
[[ -n "${EMAIL_FROM:-}" ]] || EMAIL_FROM="advent@$EMAIL_DOMAIN"
write_env EMAIL_FROM "$EMAIL_FROM"

# ── 5 ─────────────────────────────────────────────────────────────────────
stage "Domain verification"
say "Asking Resend whether it can see your DNS records yet."
printf '\n'
while :; do
  STATUS=$(domain_status "$EMAIL_DOMAIN")
  case "$STATUS" in
    verified)
      printf '  %s✓%s %s is verified.\n' "$GREEN" "$RESET" "$EMAIL_DOMAIN"
      break
      ;;
    unknown)
      warn "couldn't read the status automatically (needs jq, or the key lacks"
      warn "domain access). Check the dashboard yourself."
      open_url "https://resend.com/domains"
      confirm "Does Resend show $EMAIL_DOMAIN as Verified?" && break
      ;;
    absent)
      warn "Resend has no domain called $EMAIL_DOMAIN. Add it at stage 2."
      ;;
    *)
      warn "status is '$STATUS', not 'verified' yet."
      note "DNS can take anything from a minute to an hour."
      note "On the Resend page, click 'Verify DNS Records' to re-check."
      ;;
  esac
  confirm "Try again?" || { warn "continuing unverified — the test send will fail."; break; }
done

# ── 6 ─────────────────────────────────────────────────────────────────────
stage "Deployed Worker secrets"
say "The same two values have to reach the deployed Worker. Local .dev.vars is"
say "not uploaded — Cloudflare keeps its own copy."
printf '\n'
for NAME in RESEND_API_KEY EMAIL_FROM; do
  VALUE="${!NAME}"
  if worker_has_secret "$NAME"; then
    note "$NAME already exists on the Worker."
    if confirm "Overwrite it with the value from this run?"; then
      worker_put_secret "$NAME" "$VALUE"
    else
      note "left as it was."
    fi
  else
    worker_put_secret "$NAME" "$VALUE"
  fi
done
printf '\n'
pause

# ── 7 ─────────────────────────────────────────────────────────────────────
stage "Test send"
say "Nothing is 'set up' until a message lands in a real inbox."
printf '\n'
ask TEST_EMAIL "An inbox you can actually open right now:"
if [[ -z "${TEST_EMAIL:-}" ]]; then
  warn "need somewhere to send to."
  exit 1
fi
printf '\n'
RESPONSE=$(resend_post "/emails" "$(printf '{"from":"%s","to":"%s","subject":"Advent: email setup works","text":"If you are reading this, the Advent platform can send mail from %s. Sign-in codes will arrive this way."}' \
  "$EMAIL_FROM" "$TEST_EMAIL" "$EMAIL_DOMAIN")" 2>&1) || true

if printf '%s' "$RESPONSE" | grep -q '"id"'; then
  printf '  %s✓%s Resend accepted the message.\n' "$GREEN" "$RESET"
else
  warn "Resend refused it:"
  note "$RESPONSE"
  printf '\n'
  say "Common causes: the domain isn't verified yet, or EMAIL_FROM isn't at"
  say "$EMAIL_DOMAIN. Fix and re-run — nothing you've entered is lost."
  exit 1
fi
printf '\n'
step "Open $TEST_EMAIL and look for 'Advent: email setup works'."
note "Check spam too — a brand-new sending domain often lands there first."
printf '\n'
if ! confirm "Did it arrive?"; then
  printf '\n'
  warn "Accepted by Resend but not delivered — setup is NOT complete."
  say "Look at https://resend.com/emails for what happened to it. Re-run this"
  say "script once the DNS records are fully propagated."
  exit 1
fi

finish
[[ -n "$PUT_ON_WORKER" ]] && note "set on the deployed Worker:$PUT_ON_WORKER"
note "Local dev needs none of this: with no RESEND_API_KEY in .dev.vars,"
note "src/lib/email.ts writes the message to the server console instead."
printf '\n'
