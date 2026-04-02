#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:8081}"

PASS_COUNT=0
FAIL_COUNT=0
CREATED_ID=""

print_result() {
  local status="$1"
  local id="$2"
  local message="$3"

  if [[ "$status" == "PASS" ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    printf "[PASS] %s - %s\n" "$id" "$message"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    printf "[FAIL] %s - %s\n" "$id" "$message"
  fi
}

http_status() {
  local method="$1"
  local url="$2"
  local data="${3:-}"

  if [[ -n "$data" ]]; then
    curl -s -o /tmp/qa_body.txt -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
  else
    curl -s -o /tmp/qa_body.txt -w "%{http_code}" -X "$method" "$url"
  fi
}

contains() {
  local needle="$1"
  grep -q "$needle" /tmp/qa_body.txt
}

# TC-001
status_code="$(http_status GET "$BACKEND_URL/health")"
if [[ "$status_code" == "200" ]] && contains '"status":"healthy"' && contains '"database":"connected"'; then
  print_result PASS TC-001 "Backend health is healthy and connected"
else
  print_result FAIL TC-001 "Expected 200 + healthy/connected, got $status_code"
fi

# TC-002
status_code="$(http_status GET "$BACKEND_URL/products")"
if [[ "$status_code" == "200" ]] && grep -q '^\[' /tmp/qa_body.txt; then
  print_result PASS TC-002 "Products endpoint returns JSON array"
else
  print_result FAIL TC-002 "Expected 200 + array response, got $status_code"
fi

# TC-003
status_code="$(http_status POST "$BACKEND_URL/products" '{"name":"","price":100}')"
if [[ "$status_code" == "400" ]]; then
  print_result PASS TC-003 "Validation rejects empty name"
else
  print_result FAIL TC-003 "Expected 400, got $status_code"
fi

# TC-004
status_code="$(http_status POST "$BACKEND_URL/products" '{"name":"QA Item","price":"abc"}')"
if [[ "$status_code" == "400" ]]; then
  print_result PASS TC-004 "Validation rejects invalid price"
else
  print_result FAIL TC-004 "Expected 400, got $status_code"
fi

# TC-005
status_code="$(http_status POST "$BACKEND_URL/products" '{"name":"QA Tea","price":123}')"
if [[ "$status_code" == "201" ]]; then
  CREATED_ID="$(sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' /tmp/qa_body.txt | head -n 1)"
  if [[ -n "$CREATED_ID" ]]; then
    print_result PASS TC-005 "Created product with id $CREATED_ID"
  else
    print_result FAIL TC-005 "Created product but could not parse id"
  fi
else
  print_result FAIL TC-005 "Expected 201, got $status_code"
fi

# TC-006
if [[ -n "$CREATED_ID" ]]; then
  status_code="$(http_status GET "$BACKEND_URL/products")"
  if [[ "$status_code" == "200" ]] && contains "$CREATED_ID"; then
    print_result PASS TC-006 "Created product appears in list"
  else
    print_result FAIL TC-006 "Created product id not found in list"
  fi
else
  print_result FAIL TC-006 "Skipped because product id was not created"
fi

# TC-007
status_code="$(http_status DELETE "$BACKEND_URL/products/not-a-valid-id")"
if [[ "$status_code" == "400" ]]; then
  print_result PASS TC-007 "Invalid id delete is rejected"
else
  print_result FAIL TC-007 "Expected 400, got $status_code"
fi

# TC-008 + TC-009
if [[ -n "$CREATED_ID" ]]; then
  status_code="$(http_status DELETE "$BACKEND_URL/products/$CREATED_ID")"
  if [[ "$status_code" == "200" ]]; then
    print_result PASS TC-008 "Delete created product succeeds"
  else
    print_result FAIL TC-008 "Expected 200, got $status_code"
  fi

  status_code="$(http_status DELETE "$BACKEND_URL/products/$CREATED_ID")"
  if [[ "$status_code" == "404" ]]; then
    print_result PASS TC-009 "Deleting same product again returns not found"
  else
    print_result FAIL TC-009 "Expected 404, got $status_code"
  fi
else
  print_result FAIL TC-008 "Skipped because product id was not created"
  print_result FAIL TC-009 "Skipped because product id was not created"
fi

# TC-010
status_code="$(http_status GET "$FRONTEND_URL/")"
if [[ "$status_code" == "200" ]] && contains "Ceylon"; then
  print_result PASS TC-010 "Frontend homepage is reachable"
else
  print_result FAIL TC-010 "Expected 200 + Ceylon keyword, got $status_code"
fi

printf "\nSummary: %s passed, %s failed\n" "$PASS_COUNT" "$FAIL_COUNT"
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
