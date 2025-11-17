#!/bin/bash

# Test script for all three evaluation endpoints

# Read the sample PRD
PRD_TEXT=$(cat /Users/rohitkelapure/projects/prd-as-a-service/data/sample_prd.md)

# Escape the PRD text for JSON
PRD_JSON=$(jq -n --arg text "$PRD_TEXT" '{prd_text: $text}')

echo "========================================="
echo "Testing Binary Score Endpoint"
echo "========================================="
curl -X POST http://localhost:8080/api/evalprd/binary_score \
  -H "Content-Type: application/json" \
  -d "$PRD_JSON" \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -50

echo ""
echo "========================================="
echo "Testing Fix Plan Endpoint"
echo "========================================="
curl -X POST http://localhost:8080/api/evalprd/fix_plan \
  -H "Content-Type: application/json" \
  -d "$PRD_JSON" \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -50

echo ""
echo "========================================="
echo "Testing Agent Tasks Endpoint"
echo "========================================="
curl -X POST http://localhost:8080/api/evalprd/agent_tasks \
  -H "Content-Type: application/json" \
  -d "$PRD_JSON" \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -50
