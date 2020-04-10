#!/usr/bin/env bash
# This File Runs Coding style (eslint) tests to ensure there are no errors in the new code.
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "${GREEN}================================${NC}"
echo "${GREEN}|Starting Coding Style Tests...|${NC}"
echo "${GREEN}================================${NC}"

./node_modules/.bin/eslint --fix --quiet .

if [ $? -gt 0 ]; then
    echo "${RED}ESLint Coding Style Tests failed. Please correct them and re-run the build."
    exit 1;
fi

echo "${GREEN}ESLint Coding Style Tests passed!"
exit 0;