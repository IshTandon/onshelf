#!/bin/bash
set -e
cd /private/tmp/onshelf-build

echo "=== 1. npm install (skip if node_modules exists) ==="
if [ ! -d node_modules ]; then
  npm install
else
  echo "node_modules already exists, skipping npm install"
fi

echo ""
echo "=== 2. npm run lint ==="
npm run lint

echo ""
echo "=== 3. npm test ==="
npm test

echo ""
echo "=== 4. npm run build ==="
npm run build

echo ""
echo "=== 5. ls -la out/ ==="
ls -la out/

echo ""
echo "=== 6. npm run sample-day ==="
npm run sample-day
