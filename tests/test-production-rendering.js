// Test production API and simulate frontend rendering
// Run with: node tests/test-production-rendering.js

const testPRD = `# File Upload Feature PRD

## Problem Statement
Users currently cannot upload files to the platform, creating a significant barrier to document sharing and collaboration.

## Proposed Solution
Implement a secure, user-friendly file upload system with real-time progress tracking and comprehensive error handling.

## Technical Requirements

### F1: Upload Interface
- Drag-and-drop UI with click fallback
- File type validation (PDF, DOC, DOCX, XLS, XLSX)
- Size limit enforcement (10MB per file)
- Real-time progress bar

### F2: Backend Processing
- POST /api/upload endpoint with multipart/form-data
- File validation (type, size, virus scan)
- S3 storage with encryption at rest
- Audit logging for compliance

### F3: Error Handling
- Network error retry logic (3 attempts with exponential backoff)
- Timeout handling (30s per upload)
- User-friendly error messages
- Automatic cleanup on failure

## Success Metrics
- Upload success rate > 99%
- P95 upload time < 5s for 5MB files
- User satisfaction score > 4.5/5`;

async function testProductionAPI() {
  console.log('🌍 Testing PRODUCTION API (evalgpt.com)...\n');
  
  try {
    const response = await fetch('https://evalgpt.com/api/evalprd/agent_tasks', {
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
    let startTime = Date.now();

    console.log('📡 Receiving streaming response from production...\n');

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
            if (deltaCount % 50 === 0) {
              process.stdout.write('.');
            }
          } else if (data.type === 'done') {
            result = data.result;
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`\n\n✅ Stream completed in ${duration}s\n`);
            break;
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        }
      }

      if (result) break;
    }

    if (!result) {
      throw new Error('No result received from production API');
    }

    // Analyze result
    console.log('📊 Production API Response Analysis:\n');
    console.log(`Total tasks: ${result.tasks?.length || 0}`);
    console.log(`Total edges: ${result.edges?.length || 0}`);
    console.log(`Has mermaid: ${!!result.mermaid}\n`);

    if (!result.tasks || result.tasks.length === 0) {
      console.log('❌ ERROR: No tasks returned from production API!\n');
      console.log('This explains why the frontend is not rendering anything.\n');
      console.log('Full response:', JSON.stringify(result, null, 2));
      return false;
    }

    console.log('✅ Tasks received from production API\n');
    
    // Check first task structure
    const firstTask = result.tasks[0];
    console.log('🔍 First Task Structure Check:\n');
    
    const requiredFields = ['id', 'feature', 'title', 'description', 'duration', 'est_hours', 'owner_role', 'entry', 'exit', 'test', 'inputs', 'outputs', 'status'];
    const missingFields = requiredFields.filter(field => !(field in firstTask));
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing fields: ${missingFields.join(', ')}\n`);
      return false;
    }
    
    console.log('✅ All required fields present\n');
    
    // Display first 3 tasks
    console.log('📋 Sample Tasks:\n');
    result.tasks.slice(0, 3).forEach((task, idx) => {
      console.log(`Task ${idx + 1}:`);
      console.log(`  ID: ${task.id}`);
      console.log(`  Feature: ${task.feature}`);
      console.log(`  Title: ${task.title.substring(0, 60)}...`);
      console.log(`  Status: ${task.status}`);
      console.log(`  Inputs: ${task.inputs?.length || 0} items`);
      console.log(`  Outputs: ${task.outputs?.length || 0} items`);
      console.log('');
    });

    // Test frontend compatibility
    console.log('🎨 Frontend Rendering Compatibility Check:\n');
    
    // Check if data matches AgentTasksOutput interface
    const hasTasksArray = Array.isArray(result.tasks);
    const hasEdgesArray = Array.isArray(result.edges);
    const firstTaskHasAllFields = requiredFields.every(field => field in firstTask);
    const firstTaskInputsIsArray = Array.isArray(firstTask.inputs);
    const firstTaskOutputsIsArray = Array.isArray(firstTask.outputs);
    
    console.log(`  tasks is array: ${hasTasksArray ? '✅' : '❌'}`);
    console.log(`  edges is array: ${hasEdgesArray ? '✅' : '❌'}`);
    console.log(`  first task has all fields: ${firstTaskHasAllFields ? '✅' : '❌'}`);
    console.log(`  first task inputs is array: ${firstTaskInputsIsArray ? '✅' : '❌'}`);
    console.log(`  first task outputs is array: ${firstTaskOutputsIsArray ? '✅' : '❌'}`);
    
    const allChecksPassed = hasTasksArray && hasEdgesArray && firstTaskHasAllFields && firstTaskInputsIsArray && firstTaskOutputsIsArray;
    
    if (!allChecksPassed) {
      console.log('\n❌ Some compatibility checks failed!\n');
      return false;
    }
    
    console.log('\n✅ All compatibility checks passed!\n');
    
    // Save production response for manual inspection
    const fs = await import('fs');
    fs.writeFileSync(
      '/tmp/production-agent-tasks.json',
      JSON.stringify(result, null, 2)
    );
    console.log('💾 Full production response saved to /tmp/production-agent-tasks.json\n');
    
    return true;

  } catch (error) {
    console.error('❌ Production API test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testProductionAPI()
  .then((success) => {
    if (success) {
      console.log('✅ Production API is working correctly!\n');
      console.log('If the frontend is not rendering, the issue is likely:');
      console.log('1. Frontend build is outdated and needs redeployment');
      console.log('2. Frontend code has a rendering bug (check browser console)');
      console.log('3. Frontend is not calling the agent_tasks API');
      console.log('4. Data is being received but component is not displaying it\n');
      process.exit(0);
    } else {
      console.log('❌ Production API has issues that need to be fixed\n');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

