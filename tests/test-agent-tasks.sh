#!/bin/bash

# Test agent_tasks endpoint and save complete response
echo "Testing agent_tasks endpoint..."

curl -X POST http://localhost:8080/api/evalprd/agent_tasks \
  -H "Content-Type: application/json" \
  -d '{
    "prd_text": "# File Upload Feature\n\n## Problem\nUsers cannot upload files.\n\n## Solution\nAdd file upload button with validation.\n\n## Requirements\n- Support PDF/DOC files\n- Max 10MB size\n- Save to S3\n- Show progress bar\n- Validate file type\n- Handle errors gracefully"
  }' \
  --no-buffer 2>&1 | grep -E '^data:' | tail -1 | sed 's/^data: //' > /tmp/agent-tasks-result.json

echo ""
echo "Response saved to /tmp/agent-tasks-result.json"
echo ""
echo "Parsing result..."
cat /tmp/agent-tasks-result.json | python3 -m json.tool 2>&1 | head -100

