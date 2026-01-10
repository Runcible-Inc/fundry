#!/usr/bin/env node
/**
 * Parallel investor processing for Fundry
 * Runs multiple research + outreach calls concurrently
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, 'results');
const INVESTORS_FILE = join(__dirname, 'investors.json');

// Concurrency settings
const CONCURRENT_LIMIT = 4;  // Run 4 investors at a time
const DELAY_BETWEEN_CALLS = 1000;  // 1 second between starting new calls

// Ensure results directory exists
if (!existsSync(RESULTS_DIR)) {
  mkdirSync(RESULTS_DIR, { recursive: true });
}

// Load investors
const investors = JSON.parse(readFileSync(INVESTORS_FILE, 'utf-8'));

// Flatten all investors into a single list with category info
const allInvestors = [];
for (const [category, list] of Object.entries(investors)) {
  for (const inv of list) {
    allInvestors.push({ ...inv, category });
  }
}

console.log(`Total investors: ${allInvestors.length}`);

// Check which are already done
function safeName(name) {
  return name.replace(/ /g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

// Extract JSON from output (skip WARN lines)
function extractJson(output) {
  const lines = output.split('\n');
  const jsonLines = lines.filter(line => !line.trim().startsWith('WARN') && !line.trim().startsWith('<'));
  const jsonStr = jsonLines.join('\n').trim();
  // Find the JSON object
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (match) return match[0];
  return jsonStr;
}

function parseResult(content) {
  try {
    const jsonStr = extractJson(content);
    return JSON.parse(jsonStr);
  } catch {
    return { success: false, error: 'Parse error' };
  }
}

function isDone(name) {
  const safe = safeName(name);
  const researchFile = join(RESULTS_DIR, `${safe}_research.json`);
  const outreachFile = join(RESULTS_DIR, `${safe}_outreach.json`);
  
  if (!existsSync(researchFile) || !existsSync(outreachFile)) return false;
  
  try {
    const research = parseResult(readFileSync(researchFile, 'utf-8'));
    const outreach = parseResult(readFileSync(outreachFile, 'utf-8'));
    return research.success && outreach.success;
  } catch {
    return false;
  }
}

const pending = allInvestors.filter(inv => !isDone(inv.name));
console.log(`Already completed: ${allInvestors.length - pending.length}`);
console.log(`Remaining: ${pending.length}`);

if (pending.length === 0) {
  console.log('All investors processed!');
  process.exit(0);
}

// Process a single investor
async function processInvestor(inv) {
  const safe = safeName(inv.name);
  const researchFile = join(RESULTS_DIR, `${safe}_research.json`);
  const outreachFile = join(RESULTS_DIR, `${safe}_outreach.json`);
  
  console.log(`[START] ${inv.name} (${inv.category})`);
  
  // Research
  if (!existsSync(researchFile) || !parseResult(readFileSync(researchFile, 'utf-8')).success) {
    try {
      const researchResult = execSync(
        `fundry --robot-research '${JSON.stringify({ investor: inv.name })}'`,
        { encoding: 'utf-8', timeout: 180000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      writeFileSync(researchFile, researchResult);
      console.log(`  [RESEARCH OK] ${inv.name}`);
    } catch (e) {
      writeFileSync(researchFile, JSON.stringify({ success: false, error: e.message }));
      console.log(`  [RESEARCH FAIL] ${inv.name}: ${e.message}`);
    }
  }
  
  // Outreach
  if (!existsSync(outreachFile) || !parseResult(readFileSync(outreachFile, 'utf-8')).success) {
    try {
      const outreachResult = execSync(
        `fundry --robot-outreach '${JSON.stringify({ investor: inv.name, angle: inv.angle })}'`,
        { encoding: 'utf-8', timeout: 180000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      writeFileSync(outreachFile, outreachResult);
      console.log(`  [OUTREACH OK] ${inv.name}`);
    } catch (e) {
      writeFileSync(outreachFile, JSON.stringify({ success: false, error: e.message }));
      console.log(`  [OUTREACH FAIL] ${inv.name}: ${e.message}`);
    }
  }
  
  console.log(`[DONE] ${inv.name}`);
}

// Run with concurrency limit
async function runParallel() {
  const queue = [...pending];
  const active = new Set();
  
  async function runNext() {
    if (queue.length === 0) return;
    
    const inv = queue.shift();
    active.add(inv.name);
    
    try {
      await processInvestor(inv);
    } finally {
      active.delete(inv.name);
    }
  }
  
  // Start initial batch
  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENT_LIMIT, pending.length); i++) {
    await new Promise(r => setTimeout(r, DELAY_BETWEEN_CALLS * i));
    workers.push(runWorker());
  }
  
  async function runWorker() {
    while (queue.length > 0 || active.size > 0) {
      if (queue.length > 0 && active.size < CONCURRENT_LIMIT) {
        await runNext();
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_CALLS));
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  await Promise.all(workers);
  console.log('\n========== ALL COMPLETE ==========');
}

runParallel().catch(console.error);
