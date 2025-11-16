// Debug script to test agent_tasks rendering issue
// Run with: node tests/debug-agent-tasks.js

const testPRD = `# Patient Alert Prioritization System

## Executive Summary
Medical practices face significant inefficiency in managing patient communications. Current alert systems treat all notifications equally, resulting in 30% drop-off in critical interventions.

## Business Problem
- Volume overload: 200-500 alerts/day
- No differentiation between critical and routine
- 30% of high-priority alerts addressed >24h after receipt
- Staff burnout from manual triage

## Proposed Solution
Build an Alert Prioritization System that:
1. Ingests alerts from multiple sources (Veeva, email, LIMS)
2. Scores each alert using rules and ML (0-100 scale)
3. Routes to appropriate role based on score
4. Tracks all actions with audit trail
5. Escalates high-priority alerts if not acknowledged

## Technical Requirements

### F1: Multi-Source Alert Ingestion
- Veeva webhook: POST /api/alerts/veeva
- Email parsing: alerts@practicemail.com
- LIMS API pull every 15min
- Deduplication via SHA-256 hash

### F2: Alert Scoring & Prioritization
- Deterministic rules (60% weight)
- ML risk score (40% weight)
- P0 (≥80): Immediate
- P1 (50-79): 2h
- P2 (<50): Next day

### F3: RBAC & Audit Trail
- Roles: Hub, PAM/FAM, KAM, Admin
- ALCOA+ compliant logging
- 7-year retention
- Encrypted at rest and in transit`;

async function testAgentTasksEndpoint() {
  console.log('🧪 Testing agent_tasks endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:8080/api/evalprd/agent_tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prd_text: testPRD })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = null;
    let deltaCount = 0;

    console.log('📡 Receiving streaming response...\n');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'delta') {
            deltaCount++;
            if (deltaCount % 10 === 0) {
              process.stdout.write('.');
            }
          } else if (data.type === 'done') {
            result = data.result;
            console.log('\n\n✅ Stream completed\n');
            break;
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        }
      }

      if (result) break;
    }

    if (!result) {
      throw new Error('No result received from API');
    }

    // Analyze the result
    console.log('📊 Analysis:\n');
    console.log(`Total tasks: ${result.tasks?.length || 0}`);
    console.log(`Total edges: ${result.edges?.length || 0}`);
    console.log(`Has mermaid: ${!!result.mermaid}\n`);

    if (result.tasks && result.tasks.length > 0) {
      console.log('📋 Task Details:\n');
      result.tasks.forEach((task, idx) => {
        console.log(`Task ${idx + 1}:`);
        console.log(`  ID: ${task.id}`);
        console.log(`  Feature: ${task.feature}`);
        console.log(`  Title: ${task.title}`);
        console.log(`  Duration: ${task.duration} (${task.est_hours}h)`);
        console.log(`  Status: ${task.status}`);
        console.log(`  Inputs: ${task.inputs?.length || 0}`);
        console.log(`  Outputs: ${task.outputs?.length || 0}`);
        console.log(`  Entry: ${task.entry?.substring(0, 50)}...`);
        console.log(`  Exit: ${task.exit?.substring(0, 50)}...`);
        console.log(`  Test: ${task.test?.substring(0, 50)}...`);
        console.log('');
      });
    }

    // Validate schema
    console.log('🔍 Schema Validation:\n');
    const requiredTaskFields = ['id', 'feature', 'title', 'description', 'duration', 'est_hours', 'owner_role', 'entry', 'exit', 'test', 'entry_conditions', 'exit_conditions', 'tests', 'inputs', 'outputs', 'status'];
    
    if (result.tasks && result.tasks.length > 0) {
      const firstTask = result.tasks[0];
      const missingFields = requiredTaskFields.filter(field => !(field in firstTask));
      
      if (missingFields.length > 0) {
        console.log(`❌ Missing fields in first task: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ All required fields present in first task');
      }
      
      // Check field types
      console.log('\nField type check:');
      console.log(`  id: ${typeof firstTask.id} (expected: string)`);
      console.log(`  feature: ${typeof firstTask.feature} (expected: string)`);
      console.log(`  est_hours: ${typeof firstTask.est_hours} (expected: number)`);
      console.log(`  inputs: ${Array.isArray(firstTask.inputs) ? 'array' : typeof firstTask.inputs} (expected: array)`);
      console.log(`  outputs: ${Array.isArray(firstTask.outputs) ? 'array' : typeof firstTask.outputs} (expected: array)`);
      console.log(`  status: ${typeof firstTask.status} (expected: string in [ready, blocked, in_progress, completed])`);
    }

    // Save to file for inspection
    const fs = await import('fs');
    fs.writeFileSync(
      '/tmp/agent-tasks-debug.json',
      JSON.stringify(result, null, 2)
    );
    console.log('\n💾 Full response saved to /tmp/agent-tasks-debug.json\n');

    return result;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testAgentTasksEndpoint()
  .then(() => {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

