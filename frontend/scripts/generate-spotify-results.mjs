#!/usr/bin/env node

// Script to fetch Spotify PRD, call all 3 APIs, and save results to spotifyResults.ts
// Usage: node frontend/scripts/generate-spotify-results.mjs

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:8080';
const PDF_PATH = join(__dirname, '..', '..', 'data', 'SpotifyPRD.pdf');

// Initialize PDF.js
let pdfjsLib;
async function initPDFJS() {
  pdfjsLib = await import('pdfjs-dist');
  // Configure PDF.js worker
  const pdfjsWorkerPath = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerPath;
}

async function extractTextFromPDF(pdfPath) {
  try {
    const arrayBuffer = readFileSync(pdfPath);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const textPages = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      textPages.push(pageText);
    }

    return textPages.join('\n\n');
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    throw error;
  }
}

async function callAPI(endpoint, prdText) {
  console.log(`📡 Calling ${endpoint}...`);
  
  const response = await fetch(`${API_URL}/api/evalprd/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prd_text: prdText })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  if (!response.body) {
    throw new Error('No response body for streaming');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;
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
          if (deltaCount % 50 === 0) {
            process.stdout.write('.');
          }
        } else if (data.type === 'done') {
          result = data.result;
          if (deltaCount >= 50) {
            process.stdout.write('\n');
          }
          break;
        } else if (data.type === 'error') {
          throw new Error(data.error);
        }
      }
    }

    if (result) break;
  }

  if (!result) {
    throw new Error('Stream ended without completion');
  }

  console.log(`✅ ${endpoint} completed`);
  return result;
}

function formatJSONForTypeScript(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map(item => `${spaces}  ${formatJSONForTypeScript(item, indent + 1)}`).join(',\n');
    return `[\n${items}\n${spaces}]`;
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const items = keys.map(key => {
      const value = formatJSONForTypeScript(obj[key], indent + 1);
      return `${spaces}  ${key}: ${value}`;
    }).join(',\n');
    return `{\n${items}\n${spaces}}`;
  }
  
  if (typeof obj === 'string') {
    // Escape quotes and newlines
    const escaped = obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `"${escaped}"`;
  }
  
  return JSON.stringify(obj);
}

async function generateSpotifyResults() {
  console.log('🚀 Generating Spotify PRD evaluation results...\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`PDF Path: ${PDF_PATH}\n`);

  try {
    // Initialize PDF.js
    await initPDFJS();
    
    // Step 1: Extract text from PDF
    console.log('📄 Extracting text from PDF...');
    const prdText = await extractTextFromPDF(PDF_PATH);
    console.log(`✅ Extracted ${prdText.length} characters\n`);

    // Step 2: Call all 3 APIs in parallel
    console.log('📡 Calling APIs...\n');
    const [binaryScore, fixPlan, agentTasks] = await Promise.all([
      callAPI('binary_score', prdText),
      callAPI('fix_plan', prdText),
      callAPI('agent_tasks', prdText)
    ]);

    console.log('\n✅ All API calls completed!\n');

    // Step 3: Generate TypeScript file
    const outputPath = join(__dirname, '..', 'src', 'data', 'spotifyResults.ts');
    const fileContent = `// Spotify PRD evaluation results - generated from real API calls
// This data is used for the hero section to display example results
// Generated: ${new Date().toISOString()}
// To regenerate: node frontend/scripts/generate-spotify-results.mjs

import type {
  BinaryScoreOutput,
  FixPlanOutput,
  AgentTasksOutput,
} from "../types/api";

export const spotifyBinaryScore: BinaryScoreOutput = ${formatJSONForTypeScript(binaryScore)} as BinaryScoreOutput;

export const spotifyFixPlan: FixPlanOutput = ${formatJSONForTypeScript(fixPlan)} as FixPlanOutput;

export const spotifyAgentTasks: AgentTasksOutput = ${formatJSONForTypeScript(agentTasks)} as AgentTasksOutput;
`;

    writeFileSync(outputPath, fileContent, 'utf-8');
    console.log(`✅ Results saved to ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Binary Score: ${binaryScore.pass_count || 0}/${binaryScore.criteria?.length || 0} PASS`);
    console.log(`   - Fix Plan: ${fixPlan.items?.length || 0} items`);
    console.log(`   - Agent Tasks: ${agentTasks.tasks?.length || 0} tasks`);
    console.log(`\n✨ Done!`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
generateSpotifyResults();

