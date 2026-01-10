import { execSync } from 'child_process';
import { researchInvestor, assessFit, type InvestorBrief } from './tools/research.js';
import { draftOutreach, draftFollowUp, type OutreachEmail } from './tools/outreach.js';
import { prepMeeting, type MeetingPrep } from './tools/meetings.js';
import { 
  sendOutreachEmail, 
  listInbox, 
  searchInbox, 
  checkInvestorResponse,
  sendInvestorOutreach,
  checkCalendarAndSchedule,
  type EmailResult,
  type EmailListResult,
  type EmailSearchResult
} from './tools/email.js';

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
      'AGENTICA_API_KEY not set and could not read from 1Password.'
    );
  }
}

interface RobotResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function output<T>(result: RobotResult<T>): void {
  console.log(JSON.stringify(result, null, 2));
}

async function robotResearch(input: { investor: string }): Promise<void> {
  try {
    const data = await researchInvestor(input.investor);
    output<InvestorBrief>({ success: true, data });
  } catch (e) {
    output<InvestorBrief>({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function robotAssess(input: { investor: string }): Promise<void> {
  try {
    const data = await assessFit(input.investor);
    output({ success: true, data });
  } catch (e) {
    output({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function robotOutreach(input: { 
  investor: string; 
  angle: string;
  context?: string;
}): Promise<void> {
  try {
    // Always pass a context string to avoid Agentica encoder issues with undefined
    const context = input.context || `Outreach to ${input.investor} with ${input.angle} approach`;
    const data = await draftOutreach(input.investor, input.angle, context);
    output<OutreachEmail>({ success: true, data });
  } catch (e) {
    output<OutreachEmail>({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function robotFollowUp(input: {
  investor: string;
  meetingNotes: string;
  materialsToSend?: string[];
}): Promise<void> {
  try {
    // Always pass materials array to avoid Agentica encoder issues with undefined
    const materials = input.materialsToSend || [];
    const data = await draftFollowUp(input.investor, input.meetingNotes, materials);
    output<OutreachEmail>({ success: true, data });
  } catch (e) {
    output<OutreachEmail>({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function robotPrep(input: {
  investor: string;
  meetingDate: string;
  meetingType: 'intro_call' | 'deep_dive' | 'partner_meeting' | 'final_diligence';
}): Promise<void> {
  try {
    const data = await prepMeeting(input.investor, input.meetingDate, input.meetingType);
    output<MeetingPrep>({ success: true, data });
  } catch (e) {
    output<MeetingPrep>({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

// Email robot commands
async function robotEmailList(input: { box?: string; limit?: number }): Promise<void> {
  try {
    const box = (input.box as 'imbox' | 'feed' | 'paper_trail') || 'imbox';
    const data = await listInbox(box, input.limit || 10);
    output<EmailListResult>({ success: true, data });
  } catch (e) {
    output<EmailListResult>({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function robotEmailSearch(input: { query: string; limit?: number }): Promise<void> {
  try {
    const data = await searchInbox(input.query, input.limit || 10);
    output<EmailSearchResult>({ success: true, data });
  } catch (e) {
    output<EmailSearchResult>({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function robotEmailSend(input: { 
  to: string; 
  subject: string; 
  body: string; 
  draft?: boolean 
}): Promise<void> {
  try {
    const data = await sendOutreachEmail(input.to, input.subject, input.body, input.draft ?? false);
    output<EmailResult>({ success: true, data });
  } catch (e) {
    output<EmailResult>({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function robotCheckResponse(input: { investor: string }): Promise<void> {
  try {
    const data = await checkInvestorResponse(input.investor);
    output({ success: true, data });
  } catch (e) {
    output({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function robotSchedule(input: { 
  date: string; 
  start: string; 
  end: string; 
  title: string 
}): Promise<void> {
  try {
    const data = await checkCalendarAndSchedule(input.date, input.start, input.end, input.title);
    output({ success: true, data });
  } catch (e) {
    output({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
}

function printRobotHelp(): void {
  const help = {
    commands: {
      '--robot-research': {
        description: 'Research an investor/firm',
        input: { investor: 'string (required)' },
        example: '--robot-research \'{"investor": "Sequoia Capital"}\''
      },
      '--robot-assess': {
        description: 'Assess investor fit for Runcible',
        input: { investor: 'string (required)' },
        example: '--robot-assess \'{"investor": "a16z"}\''
      },
      '--robot-outreach': {
        description: 'Draft cold outreach email',
        input: {
          investor: 'string (required)',
          angle: '"strategic_partnership" | "series_a" | "angel_check" | "intro_request" (required)',
          context: 'string (optional)'
        },
        example: '--robot-outreach \'{"investor": "Microsoft", "angle": "strategic_partnership"}\''
      },
      '--robot-followup': {
        description: 'Draft follow-up email after meeting',
        input: {
          investor: 'string (required)',
          meetingNotes: 'string (required)',
          materialsToSend: 'string[] (optional)'
        },
        example: '--robot-followup \'{"investor": "Sequoia", "meetingNotes": "Discussed Series A terms..."}\''
      },
      '--robot-prep': {
        description: 'Prepare for investor meeting',
        input: {
          investor: 'string (required)',
          meetingDate: 'string (required)',
          meetingType: '"intro_call" | "deep_dive" | "partner_meeting" | "final_diligence" (required)'
        },
        example: '--robot-prep \'{"investor": "a16z", "meetingDate": "2024-12-15", "meetingType": "intro_call"}\''
      },
      '--robot-email-list': {
        description: 'List emails from Hey inbox',
        input: {
          box: '"imbox" | "feed" | "paper_trail" (optional, default: imbox)',
          limit: 'number (optional, default: 10)'
        },
        example: '--robot-email-list \'{"box": "imbox", "limit": 5}\''
      },
      '--robot-email-search': {
        description: 'Search emails in Hey',
        input: {
          query: 'string (required)',
          limit: 'number (optional, default: 10)'
        },
        example: '--robot-email-search \'{"query": "Sequoia"}\''
      },
      '--robot-email-send': {
        description: 'Send email via Hey',
        input: {
          to: 'string (required)',
          subject: 'string (required)',
          body: 'string (required)',
          draft: 'boolean (optional, default: false)'
        },
        example: '--robot-email-send \'{"to": "investor@vc.com", "subject": "Runcible", "body": "Hi...", "draft": true}\''
      },
      '--robot-check-response': {
        description: 'Check for investor email responses',
        input: { investor: 'string (required)' },
        example: '--robot-check-response \'{"investor": "Sequoia"}\''
      },
      '--robot-schedule': {
        description: 'Check availability and schedule meeting',
        input: {
          date: 'string YYYY-MM-DD (required)',
          start: 'string HH:MM (required)',
          end: 'string HH:MM (required)',
          title: 'string (required)'
        },
        example: '--robot-schedule \'{"date": "2025-12-20", "start": "14:00", "end": "15:00", "title": "Sequoia Intro"}\''
      }
    }
  };
  console.log(JSON.stringify(help, null, 2));
}

export async function handleRobotCommand(args: string[]): Promise<boolean> {
  const command = args[0];
  const jsonArg = args[1];

  if (command === '--robot-help') {
    printRobotHelp();
    return true;
  }

  if (!command?.startsWith('--robot-')) {
    return false;
  }

  // Initialize API key
  process.env.AGENTICA_API_KEY = getApiKey();

  if (!jsonArg) {
    output({ success: false, error: 'Missing JSON argument. Use --robot-help for usage.' });
    return true;
  }

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(jsonArg);
  } catch {
    output({ success: false, error: 'Invalid JSON argument' });
    return true;
  }

  switch (command) {
    case '--robot-research':
      if (!input.investor || typeof input.investor !== 'string') {
        output({ success: false, error: 'Missing required field: investor (string)' });
        return true;
      }
      await robotResearch({ investor: input.investor });
      break;

    case '--robot-assess':
      if (!input.investor || typeof input.investor !== 'string') {
        output({ success: false, error: 'Missing required field: investor (string)' });
        return true;
      }
      await robotAssess({ investor: input.investor });
      break;

    case '--robot-outreach':
      if (!input.investor || typeof input.investor !== 'string') {
        output({ success: false, error: 'Missing required field: investor (string)' });
        return true;
      }
      if (!input.angle || typeof input.angle !== 'string') {
        output({ success: false, error: 'Missing required field: angle' });
        return true;
      }
      await robotOutreach({
        investor: input.investor,
        angle: input.angle as 'strategic_partnership' | 'series_a' | 'angel_check' | 'intro_request',
        context: input.context as string | undefined
      });
      break;

    case '--robot-followup':
      if (!input.investor || typeof input.investor !== 'string') {
        output({ success: false, error: 'Missing required field: investor (string)' });
        return true;
      }
      if (!input.meetingNotes || typeof input.meetingNotes !== 'string') {
        output({ success: false, error: 'Missing required field: meetingNotes (string)' });
        return true;
      }
      await robotFollowUp({
        investor: input.investor,
        meetingNotes: input.meetingNotes,
        materialsToSend: input.materialsToSend as string[] | undefined
      });
      break;

    case '--robot-prep':
      if (!input.investor || typeof input.investor !== 'string') {
        output({ success: false, error: 'Missing required field: investor (string)' });
        return true;
      }
      if (!input.meetingDate || typeof input.meetingDate !== 'string') {
        output({ success: false, error: 'Missing required field: meetingDate (string)' });
        return true;
      }
      if (!input.meetingType || typeof input.meetingType !== 'string') {
        output({ success: false, error: 'Missing required field: meetingType' });
        return true;
      }
      await robotPrep({
        investor: input.investor,
        meetingDate: input.meetingDate,
        meetingType: input.meetingType as 'intro_call' | 'deep_dive' | 'partner_meeting' | 'final_diligence'
      });
      break;

    case '--robot-email-list':
      await robotEmailList({
        box: input.box as string | undefined,
        limit: input.limit as number | undefined
      });
      break;

    case '--robot-email-search':
      if (!input.query || typeof input.query !== 'string') {
        output({ success: false, error: 'Missing required field: query (string)' });
        return true;
      }
      await robotEmailSearch({
        query: input.query,
        limit: input.limit as number | undefined
      });
      break;

    case '--robot-email-send':
      if (!input.to || typeof input.to !== 'string') {
        output({ success: false, error: 'Missing required field: to (string)' });
        return true;
      }
      if (!input.subject || typeof input.subject !== 'string') {
        output({ success: false, error: 'Missing required field: subject (string)' });
        return true;
      }
      if (!input.body || typeof input.body !== 'string') {
        output({ success: false, error: 'Missing required field: body (string)' });
        return true;
      }
      await robotEmailSend({
        to: input.to,
        subject: input.subject,
        body: input.body,
        draft: input.draft as boolean | undefined
      });
      break;

    case '--robot-check-response':
      if (!input.investor || typeof input.investor !== 'string') {
        output({ success: false, error: 'Missing required field: investor (string)' });
        return true;
      }
      await robotCheckResponse({ investor: input.investor });
      break;

    case '--robot-schedule':
      if (!input.date || typeof input.date !== 'string') {
        output({ success: false, error: 'Missing required field: date (string)' });
        return true;
      }
      if (!input.start || typeof input.start !== 'string') {
        output({ success: false, error: 'Missing required field: start (string)' });
        return true;
      }
      if (!input.end || typeof input.end !== 'string') {
        output({ success: false, error: 'Missing required field: end (string)' });
        return true;
      }
      if (!input.title || typeof input.title !== 'string') {
        output({ success: false, error: 'Missing required field: title (string)' });
        return true;
      }
      await robotSchedule({
        date: input.date,
        start: input.start,
        end: input.end,
        title: input.title
      });
      break;

    default:
      output({ success: false, error: `Unknown robot command: ${command}. Use --robot-help for available commands.` });
  }

  return true;
}
