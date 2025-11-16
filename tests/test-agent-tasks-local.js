#!/usr/bin/env node

// Test script for agent_tasks endpoint locally
// Usage: node tests/test-agent-tasks-local.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:8080';
const PRD_PATH = process.env.PRD_PATH || join(__dirname, '..', 'data', 'sample_prd.md');

async function testAgentTasks() {
  console.log('🧪 Testing Agent Tasks API...\n');
  console.log(`API URL: ${API_URL}/api/evalprd/agent_tasks`);
  console.log(`PRD File: ${PRD_PATH}\n`);

  // Read PRD file
  let prdText;
  try {
    prdText = readFileSync(PRD_PATH, 'utf-8');
    console.log(`✅ Loaded PRD (${prdText.length} characters)\n`);
  } catch (error) {
    console.error(`❌ Failed to read PRD file: ${error.message}`);
    process.exit(1);
  }

  // Make request
  try {
    const response = await fetch(`${API_URL}/api/evalprd/agent_tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prd_text: prdText }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      process.exit(1);
    }

    console.log('📡 Streaming response...\n');
    console.log('---');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            
            if (event.type === 'delta') {
              process.stdout.write('.');
            } else if (event.type === 'done') {
              finalResult = event.result;
              console.log('\n\n✅ Received final result!\n');
            } else if (event.type === 'error') {
              console.error(`\n❌ Error: ${event.error}`);
              process.exit(1);
            }
          } catch (e) {
            // Ignore parse errors for non-JSON lines
          }
        } else if (line.startsWith(': heartbeat')) {
          // Heartbeat - ignore
        }
      }
    }

    if (!finalResult) {
      console.error('\n❌ No final result received');
      process.exit(1);
    }

    // Display results
    console.log('📊 Results Summary:');
    console.log('='.repeat(50));
    
    if (finalResult.tasks && Array.isArray(finalResult.tasks)) {
      console.log(`\n✅ Total Tasks: ${finalResult.tasks.length}\n`);
      
      finalResult.tasks.forEach((task, index) => {
        console.log(`Task ${index + 1}: ${task.title || 'Untitled'}`);
        console.log(`  Feature: ${task.feature || 'N/A'}`);
        console.log(`  Duration: ${task.duration || 'N/A'} (${task.est_hours || 'N/A'} hours)`);
        console.log(`  Status: ${task.status || 'N/A'}`);
        if (task.dependencies && task.dependencies.length > 0) {
          console.log(`  Dependencies: ${task.dependencies.join(', ')}`);
        }
        console.log('');
      });

      // Show full JSON
      console.log('\n📄 Full JSON Response:');
      console.log('='.repeat(50));
      console.log(JSON.stringify(finalResult, null, 2));
    } else {
      console.log('\n⚠️  No tasks array found in response');
      console.log('\n📄 Full Response:');
      console.log(JSON.stringify(finalResult, null, 2));
    }

  } catch (error) {
    console.error(`\n❌ Request failed: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the API gateway is running:');
      console.error('   cd api-gateway && npm run dev');
    }
    process.exit(1);
  }
}

testAgentTasks().catch(console.error);

