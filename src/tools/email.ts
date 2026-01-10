import { execSync } from 'child_process';
import { agentic } from '@symbolica/agentica';

export interface EmailResult {
  success: boolean;
  sent?: boolean;
  draft?: boolean;
  email?: { to: string; subject: string };
  error?: string;
}

export interface EmailListResult {
  box: string;
  count: number;
  emails: Array<{
    id: string;
    from: string;
    subject: string;
    preview: string;
    date: string;
    unread: boolean;
  }>;
}

export interface EmailSearchResult {
  query: string;
  count: number;
  results: Array<{
    id: string;
    from: string;
    subject: string;
    preview: string;
    date: string;
  }>;
}

function runHeycli(command: object): any {
  try {
    const result = execSync(
      `heycli '${JSON.stringify(command)}'`,
      { encoding: 'utf-8', timeout: 60000 }
    );
    return JSON.parse(result);
  } catch (e: any) {
    if (e.stdout) {
      try {
        return JSON.parse(e.stdout);
      } catch {}
    }
    throw new Error(`heycli failed: ${e.message}`);
  }
}

export async function sendOutreachEmail(
  to: string,
  subject: string,
  body: string,
  draftOnly: boolean = false
): Promise<EmailResult> {
  const action = draftOnly ? 'email-draft' : 'email-send';
  return runHeycli({ action, to, subject, body });
}

export async function listInbox(
  box: 'imbox' | 'feed' | 'paper_trail' = 'imbox',
  limit: number = 10
): Promise<EmailListResult> {
  return runHeycli({ action: 'email-list', box, limit });
}

export async function searchInbox(
  query: string,
  limit: number = 10
): Promise<EmailSearchResult> {
  return runHeycli({ action: 'email-search', query, limit });
}

export async function readEmail(emailId: string): Promise<any> {
  return runHeycli({ action: 'email-read', emailId });
}

export async function checkInvestorResponse(investorName: string): Promise<{
  found: boolean;
  emails: Array<{ id: string; from: string; subject: string; date: string; preview: string }>;
  summary: string;
}> {
  const searchResult = await searchInbox(investorName, 20);
  
  if (searchResult.count === 0) {
    return {
      found: false,
      emails: [],
      summary: `No emails found matching "${investorName}"`
    };
  }

  const emailSummary = searchResult.results.map(e => 
    `- [${e.date}] From: ${e.from} | Subject: ${e.subject} | Preview: ${e.preview}`
  ).join('\n');

  const summary = await agentic<string>(
    `Summarize the email thread status with "${investorName}" based on these emails:
    
    ${emailSummary}
    
    Provide a brief summary of:
    1. Current status of communication
    2. Last interaction date
    3. Any pending action items
    4. Recommended next step`,
    { investorName, emailCount: searchResult.count }
  );

  return {
    found: true,
    emails: searchResult.results,
    summary
  };
}

export async function sendInvestorOutreach(
  investorName: string,
  email: string,
  outreach: { subject: string; body: string; callToAction: string },
  draftOnly: boolean = true
): Promise<EmailResult & { investor: string }> {
  const fullBody = `${outreach.body}\n\n${outreach.callToAction}\n\nBest regards,\nMoritz Bierling\nChief Business Officer, Runcible`;
  
  const result = await sendOutreachEmail(email, outreach.subject, fullBody, draftOnly);
  
  return {
    ...result,
    investor: investorName
  };
}

export async function batchDraftOutreach(
  investors: Array<{ name: string; email: string; outreach: { subject: string; body: string; callToAction: string } }>
): Promise<Array<EmailResult & { investor: string }>> {
  const results: Array<EmailResult & { investor: string }> = [];
  
  for (const inv of investors) {
    try {
      const result = await sendInvestorOutreach(inv.name, inv.email, inv.outreach, true);
      results.push(result);
      // Small delay between drafts to avoid overwhelming the browser
      await new Promise(r => setTimeout(r, 2000));
    } catch (e: any) {
      results.push({
        success: false,
        error: e.message,
        investor: inv.name
      });
    }
  }
  
  return results;
}

export async function checkCalendarAndSchedule(
  date: string,
  start: string,
  end: string,
  title: string
): Promise<{ available: boolean; scheduled?: boolean; conflicts?: string[] }> {
  // Check availability
  const freebusy = runHeycli({ action: 'freebusy', date, start, end });
  
  if (!freebusy.isFree) {
    return {
      available: false,
      conflicts: freebusy.conflicts
    };
  }
  
  // Schedule if available
  const created = runHeycli({ action: 'create', title, date, start, end });
  
  return {
    available: true,
    scheduled: created.success
  };
}
