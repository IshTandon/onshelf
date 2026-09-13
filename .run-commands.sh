#!/bin/bash
set -e
cd /private/tmp/onshelf-build

echo "=== COMMAND 1: npm install ==="
npm install 2>&1
echo "EXIT_CODE: $?"

echo ""
echo "=== COMMAND 2: npm test ==="
npm test 2>&1
echo "EXIT_CODE: $?"

echo ""
echo "=== COMMAND 3: npm run sample-day ==="
npm run sample-day 2>&1
echo "EXIT_CODE: $?"
