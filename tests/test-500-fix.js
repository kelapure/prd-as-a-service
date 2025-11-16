#!/usr/bin/env node

// Test script to verify fix_plan and agent_tasks endpoints work after API key fix

const testPRD = `# PRD: User Login Feature

## Business Problem
Users cannot access the application because there is no login functionality.
Current workaround requires manual credential management which causes security issues.

## Solution
Implement a secure login system with username/password authentication.

## Technical Requirements
- Login form with username and password fields
- Backend API endpoint for authentication
- Session management with JWT tokens
- Password hashing with bcrypt
- Rate limiting to prevent brute force attacks

## Success Metrics
- 100% of users can successfully authenticate
- Login time < 2 seconds
- Zero password breaches in first 6 months
`;

async function testEndpoint(name, url) {
  console.log(`\n[${name}] Testing endpoint: ${url}`);
  console.log(`[${name}] PRD length: ${testPRD.length} characters\n`);

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let eventCount = 0;
    let lastDelta = '';
    let finalResult = null;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prd_text: testPRD })
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              try {
                const event = JSON.parse(jsonStr);
                eventCount++;

                if (event.type === 'delta') {
                  lastDelta = event.delta;
                  if (eventCount % 10 === 0) {
                    process.stdout.write('.');
                  }
                } else if (event.type === 'done') {
                  finalResult = event.result;
                  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                  console.log(`\n\n[${name}] ✅ Success!`);
                  console.log(`[${name}] Duration: ${duration}s`);
                  console.log(`[${name}] Events received: ${eventCount}`);
                  console.log(`[${name}] Result keys: ${Object.keys(finalResult || {}).join(', ')}`);
                  resolve({ success: true, duration, eventCount, result: finalResult });
                } else if (event.type === 'error') {
                  throw new Error(event.error);
                }
              } catch (parseError) {
                // Ignore heartbeat comments and malformed JSON
              }
            }
          }
        }

        if (!finalResult) {
          throw new Error('Stream ended without done event');
        }
      })
      .catch((error) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n\n[${name}] ❌ Failed!`);
        console.log(`[${name}] Duration: ${duration}s`);
        console.log(`[${name}] Error: ${error.message}`);
        reject({ success: false, duration, error: error.message });
      });
  });
}

async function runTests() {
  console.log('=================================================');
  console.log('Testing API Gateway Endpoints After API Key Fix');
  console.log('=================================================');

  const results = {
    binary_score: null,
    fix_plan: null,
    agent_tasks: null
  };

  try {
    results.binary_score = await testEndpoint('binary_score', 'http://localhost:8080/api/evalprd/binary_score');
  } catch (error) {
    results.binary_score = error;
  }

  try {
    results.fix_plan = await testEndpoint('fix_plan', 'http://localhost:8080/api/evalprd/fix_plan');
  } catch (error) {
    results.fix_plan = error;
  }

  try {
    results.agent_tasks = await testEndpoint('agent_tasks', 'http://localhost:8080/api/evalprd/agent_tasks');
  } catch (error) {
    results.agent_tasks = error;
  }

  console.log('\n=================================================');
  console.log('Test Summary');
  console.log('=================================================');
  console.log(`binary_score:  ${results.binary_score?.success ? '✅ PASS' : '❌ FAIL'} (${results.binary_score?.duration || '0'}s)`);
  console.log(`fix_plan:      ${results.fix_plan?.success ? '✅ PASS' : '❌ FAIL'} (${results.fix_plan?.duration || '0'}s)`);
  console.log(`agent_tasks:   ${results.agent_tasks?.success ? '✅ PASS' : '❌ FAIL'} (${results.agent_tasks?.duration || '0'}s)`);
  console.log('=================================================');

  const allPassed = results.binary_score?.success && results.fix_plan?.success && results.agent_tasks?.success;
  process.exit(allPassed ? 0 : 1);
}

runTests();

