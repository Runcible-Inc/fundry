#!/usr/bin/env node
import { spawn } from '@symbolica/agentica';
import * as readline from 'readline';
import { execSync } from 'child_process';

import { researchInvestor, assessFit } from './tools/research.js';
import { draftOutreach, draftFollowUp } from './tools/outreach.js';
import { prepMeeting } from './tools/meetings.js';
import { 
  sendOutreachEmail, 
  listInbox, 
  searchInbox, 
  checkInvestorResponse,
  sendInvestorOutreach,
  checkCalendarAndSchedule
} from './tools/email.js';
import { handleRobotCommand } from './cli.js';

function getApiKey(): string {
  const envKey = process.env.AGENTICA_API_KEY;
  if (envKey) return envKey;

  try {
    const key = execSync(
      'op read "op://Personal/Symbolica/API Key"',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return key;
  } catch {
    throw new Error(
      'AGENTICA_API_KEY not set and could not read from 1Password.\n' +
      'Either set AGENTICA_API_KEY or ensure 1Password CLI is configured.'
    );
  }
}

const PREMISE = `You are Fundry, the Runcible fundraising assistant.

Runcible is "The Governance Layer for AI" - an AI company built on Natural Law Institute 
science of decidability. We provide truth-constrained, auditable, ethical AI for high-stakes 
use cases in finance, healthcare, defense, and government.

Current fundraising status:
- Target raise: $20-30M USD
- Timeline: Close by February (ideally December)
- Key team: Curt Doolittle (founder/lead), Moritz Bierling (Chief Business Officer, fundraising)

Your role is to assist with all aspects of the fundraising pipeline:
- PROSPECTS: Initial investor identification
- RESEARCHED: Due diligence on potential investors
- OUTREACH INITIATED: Drafting cold emails and intro requests  
- MEETING SCHEDULED: Preparing for investor meetings
- MEETING COMPLETED: Capturing notes and insights
- FOLLOW-UP REQUIRED: Drafting follow-up communications
- DUE DILIGENCE: Supporting investor questions
- TERM SHEET: Reviewing terms (flag for human review)
- CLOSED: Documenting outcomes

You have tools to:
- Research investors and assess fit
- Draft outreach emails and follow-ups
- Prepare for meetings
- Send emails via Hey.com (drafts or direct send)
- Check inbox for investor responses
- Schedule meetings on Hey Calendar

Use them proactively when they would help answer the user's request.
Be direct, professional, and focused on moving deals forward.`;

async function main() {
  // Check for robot commands first
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0]?.startsWith('--robot')) {
    const handled = await handleRobotCommand(args);
    if (handled) return;
  }

  // Interactive mode
  const apiKey = getApiKey();
  process.env.AGENTICA_API_KEY = apiKey;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  FUNDRY - Runcible Fundraising Agent                      ║');
  console.log('║  Type "quit" to exit, "help" for commands                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  await using agent = await spawn({ premise: PREMISE });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    const userInput = await question('\nYou: ');
    
    if (userInput.toLowerCase() === 'quit') {
      console.log('\nClosing Fundry. Good luck with the raise!\n');
      break;
    }

    if (userInput.toLowerCase() === 'help') {
      console.log(`
Available commands:
  research <investor>     - Deep dive on an investor/firm
  assess <investor>       - Quick fit assessment
  outreach <investor>     - Draft cold email
  prep <investor> <date>  - Prepare for meeting
  followup <investor>     - Draft follow-up email
  
Email (via Hey.com):
  inbox                   - List recent emails
  check <investor>        - Check for responses from investor
  send <to> <subject>     - Send email (will ask for body)
  schedule <date> <time>  - Check availability and schedule
  
Or just chat naturally about your fundraising needs.
`);
      continue;
    }

    try {
      process.stdout.write('\nFundry: ');
      
      const result = await agent.call<string>(
        userInput,
        { 
          researchInvestor,
          assessFit,
          draftOutreach,
          draftFollowUp,
          prepMeeting,
          sendOutreachEmail,
          listInbox,
          searchInbox,
          checkInvestorResponse,
          sendInvestorOutreach,
          checkCalendarAndSchedule,
        },
        {
          listener: (_iid: string, chunk: { role?: string; content?: string }) => {
            if (chunk.role === 'agent' && chunk.content) {
              process.stdout.write(chunk.content);
            }
          },
        }
      );
      
      console.log();
      if (result && typeof result === 'string' && result.trim()) {
        console.log(`\n${result}`);
      }
    } catch (error) {
      console.error('\nError:', error instanceof Error ? error.message : error);
    }
  }

  rl.close();
}

main().catch(console.error);
