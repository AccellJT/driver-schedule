#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="driver-schedule"
REGION="us-central1"
REMOTE_NAME="origin"
BRANCH_NAME="main"
PROJECT_ROOT="/Users/jt/driver-schedule/frontend"

cd "$PROJECT_ROOT"

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is not installed."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed."
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud is not installed."
  exit 1
fi

if [ ! -d ".git" ]; then
  echo "Error: no .git folder found in $PROJECT_ROOT"
  echo "Make sure this is the repo root."
  exit 1
fi

COMMIT_MESSAGE="${1:-Update app and deploy}"

echo ""
echo "== Working directory =="
pwd

echo ""
echo "== Git status =="
git status --short

echo ""
echo "== Pull latest from ${REMOTE_NAME}/${BRANCH_NAME} =="
git pull "${REMOTE_NAME}" "${BRANCH_NAME}"

echo ""
echo "== Stage changes =="
git add .

if git diff --cached --quiet; then
  echo "No staged changes to commit."
else
  echo ""
  echo "== Commit changes =="
  git commit -m "${COMMIT_MESSAGE}"
fi

echo ""
echo "== Push to ${REMOTE_NAME}/${BRANCH_NAME} =="
git push "${REMOTE_NAME}" "${BRANCH_NAME}"

echo ""
echo "== Install dependencies =="
npm install

echo ""
echo "== Production build =="
npm run build

echo ""
echo "== Deploy to Cloud Run =="
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --allow-unauthenticated

echo ""
echo "Deploy complete."