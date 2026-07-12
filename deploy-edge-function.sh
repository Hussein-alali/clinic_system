#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Deploys the admin-create-user Edge Function so admins can create
# employee accounts without limits (no signup rate limit, no email
# confirmation). Run from the repo root.
#
# You need two things from https://supabase.com/dashboard :
#   1. Your PROJECT REF — the subdomain of your project URL
#      (https://<PROJECT_REF>.supabase.co), also shown under
#      Project Settings → General.
#   2. A personal ACCESS TOKEN — create one at
#      https://supabase.com/dashboard/account/tokens
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_xxx ./deploy-edge-function.sh <PROJECT_REF>
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_REF="${1:-}"
if [ -z "$PROJECT_REF" ]; then
  read -rp "Project ref (the xxxx in https://xxxx.supabase.co): " PROJECT_REF
fi
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  read -rsp "Supabase access token (sbp_…): " SUPABASE_ACCESS_TOKEN
  echo
  export SUPABASE_ACCESS_TOKEN
fi

npx -y supabase functions deploy admin-create-user \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo
echo "✔ Deployed. No secrets to configure — SUPABASE_URL / SUPABASE_ANON_KEY /"
echo "  SUPABASE_SERVICE_ROLE_KEY are injected into Edge Functions automatically."
echo "  Create a user from Settings → المستخدمون والأدوار to confirm it works."
