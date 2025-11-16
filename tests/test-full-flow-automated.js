// Automated end-to-end test for complete upload and rendering flow
// Run with: node tests/test-full-flow-automated.js

const testPRD = `# Patient Portal Feature

## Executive Summary
Build a patient-facing web portal for appointment scheduling, medical records access, and secure messaging with healthcare providers.

## Business Problem
- Patients call office for appointments (80% of calls)
- Medical records requests take 5-7 days
- Provider messages go through staff relay

## Solution
Self-service patient portal with:
- Online appointment booking
- Instant medical records access
- Direct secure messaging
- Prescription refill requests

## Technical Requirements

### F1: Appointment Scheduling
- View provider availability in real-time
- Book/cancel/reschedule appointments
- Receive email and SMS confirmations
- Sync with practice management system (Athena)

### F2: Medical Records
- View lab results, visit summaries, medications
- Download PDF copies
- HIPAA-compliant access logs
- Redact sensitive notes per provider discretion

### F3: Secure Messaging
- Encrypted end-to-end messaging
- 24h provider response SLA
- File attachments up to 10MB
- Read receipts and notifications

## Success Metrics
- 50% reduction in appointment-related phone calls
- Medical records delivered in <5 minutes
- 90% message response within 24h
- Patient satisfaction > 4.5/5`;

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Upload Flow\n');
  console.log('=====================================\n');

  try {
    // Step 1: Test Binary Score API
    console.log('1️⃣  Testing Binary Score API...');
    const binaryScoreResult = await testEndpoint('binary_score');
    console.log(`   ✅ Received ${binaryScoreResult.criteria?.length || 0} criteria\n`);

    // Step 2: Test Fix Plan API
    console.log('2️⃣  Testing Fix Plan API...');
    const fixPlanResult = await testEndpoint('fix_plan');
    console.log(`   ✅ Received ${fixPlanResult.items?.length || 0} fix items\n`);

    // Step 3: Test Agent Tasks API
    console.log('3️⃣  Testing Agent Tasks API...');
    const agentTasksResult = await testEndpoint('agent_tasks');
    console.log(`   ✅ Received ${agentTasksResult.tasks?.length || 0} tasks\n`);

    // Validate Agent Tasks Response
    console.log('🔍 Validating Agent Tasks Response...\n');
    
    if (!agentTasksResult.tasks || agentTasksResult.tasks.length === 0) {
      console.log('❌ FAIL: No tasks in response!');
      console.log('Response:', JSON.stringify(agentTasksResult, null, 2));
      return false;
    }

    const firstTask = agentTasksResult.tasks[0];
    const requiredFields = [
      'id', 'feature', 'title', 'description', 
      'duration', 'est_hours', 'owner_role',
      'entry', 'exit', 'test',
      'entry_conditions', 'exit_conditions', 'tests',
      'inputs', 'outputs', 'status'
    ];

    const missingFields = requiredFields.filter(field => !(field in firstTask));
    
    if (missingFields.length > 0) {
      console.log(`❌ FAIL: Missing fields: ${missingFields.join(', ')}`);
      return false;
    }

    console.log('✅ All required fields present');
    console.log(`✅ Tasks are arrays: inputs=${Array.isArray(firstTask.inputs)}, outputs=${Array.isArray(firstTask.outputs)}`);
    console.log(`✅ Status is valid: ${firstTask.status}\n`);

    // Display sample tasks
    console.log('📋 Sample Tasks:\n');
    agentTasksResult.tasks.slice(0, 3).forEach((task, idx) => {
      console.log(`   Task ${idx + 1}: ${task.id} - ${task.title}`);
      console.log(`      Feature: ${task.feature}`);
      console.log(`      Duration: ${task.duration} (${task.est_hours}h)`);
      console.log(`      Status: ${task.status}`);
      console.log(`      Inputs: ${task.inputs?.length || 0}, Outputs: ${task.outputs?.length || 0}`);
      console.log('');
    });

    // Calculate total hours
    const totalHours = agentTasksResult.tasks.reduce((sum, task) => sum + (task.est_hours || 0), 0);
    console.log(`📊 Summary: ${agentTasksResult.tasks.length} tasks, ${totalHours} total hours\n`);

    // Simulated Frontend Rendering Test
    console.log('🎨 Simulated Frontend Rendering Test...\n');
    
    // Check conditions that would cause rendering issues
    const issues = [];
    
    if (!agentTasksResult || typeof agentTasksResult !== 'object') {
      issues.push('data is not an object');
    }
    
    if (!Array.isArray(agentTasksResult.tasks)) {
      issues.push('tasks is not an array');
    }
    
    if (agentTasksResult.tasks.length === 0) {
      issues.push('tasks array is empty');
    }
    
    agentTasksResult.tasks.forEach((task, idx) => {
      if (!task.id) issues.push(`task ${idx} missing id`);
      if (!task.feature) issues.push(`task ${idx} missing feature`);
      if (!task.title) issues.push(`task ${idx} missing title`);
      if (!task.description) issues.push(`task ${idx} missing description`);
      if (!Array.isArray(task.inputs)) issues.push(`task ${idx} inputs not array`);
      if (!Array.isArray(task.outputs)) issues.push(`task ${idx} outputs not array`);
    });

    if (issues.length > 0) {
      console.log('❌ Rendering would fail due to:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      return false;
    }

    console.log('✅ Data structure is compatible with AgentTasksExample component');
    console.log('✅ All tasks have required fields for rendering');
    console.log('✅ Arrays (inputs/outputs) are properly formatted\n');

    // Save results for manual inspection
    const fs = await import('fs');
    fs.writeFileSync(
      '/tmp/test-full-flow-results.json',
      JSON.stringify({
        binaryScore: binaryScoreResult,
        fixPlan: fixPlanResult,
        agentTasks: agentTasksResult
      }, null, 2)
    );
    console.log('💾 Full results saved to /tmp/test-full-flow-results.json\n');

    console.log('=====================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('=====================================\n');
    console.log('The API is working correctly and returning properly formatted data.');
    console.log('If the frontend is not rendering on evalgpt.com, the issue is:');
    console.log('  1. Frontend build deployed to production is outdated');
    console.log('  2. There is a runtime error in the browser (check console)');
    console.log('  3. The component is not receiving data from App.tsx state\n');
    
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function testEndpoint(endpoint) {
  const response = await fetch(`http://localhost:8080/api/evalprd/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prd_text: testPRD })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let deltaCount = 0;

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
          if (deltaCount % 100 === 0) {
            process.stdout.write('.');
          }
        } else if (data.type === 'done') {
          if (deltaCount >= 100) {
            process.stdout.write('\n');
          }
          return data.result;
        } else if (data.type === 'error') {
          throw new Error(data.error);
        }
      }
    }
  }

  throw new Error('Stream ended without completion');
}

// Run the test
testCompleteFlow()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

