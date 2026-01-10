import { agentic } from '@symbolica/agentica';

export interface OutreachEmail {
  subject: string;
  body: string;
  callToAction: string;
}

export async function draftOutreach(
  investorName: string,
  angle: string,
  context?: string
): Promise<OutreachEmail> {
  const angleDescription = {
    'strategic_partnership': 'emphasize mutual value creation and partnership potential',
    'series_a': 'focus on market timing, team strength, and growth trajectory',
    'angel_check': 'appeal to personal conviction and early-stage opportunity',
    'intro_request': 'ask specifically who in their network could make an introduction'
  }[angle] || 'standard fundraising approach';

  return await agentic(
    `Draft a cold outreach email to "${investorName}" for Runcible fundraising.
    
    Approach: ${angle} - ${angleDescription}
    ${context ? `Additional context: ${context}` : ''}
    
    Runcible positioning:
    - "The Governance Layer for AI"
    - Truth-constrained, auditable, ethical AI for high-stakes use
    - Target verticals: finance, healthcare, defense, government
    - Built on Natural Law Institute science of decidability
    - Currently raising $20-30M
    
    Guidelines:
    - Be concise and respectful of their time
    - Lead with the problem we solve, not features
    - For strategic_partnership: emphasize mutual value creation
    - For series_a: focus on market timing and team
    - For angel_check: personal conviction angle
    - For intro_request: ask specifically who could make intro
    
    Return subject line, email body, and clear call to action.`,
    { investorName, angle, context }
  );
}

export async function draftFollowUp(
  investorName: string,
  meetingNotes: string,
  materialsToSend?: string[]
): Promise<OutreachEmail> {
  return await agentic(
    `Draft a follow-up email to "${investorName}" after our meeting.
    
    Meeting notes:
    ${meetingNotes}
    
    ${materialsToSend ? `Materials to attach/reference: ${materialsToSend.join(', ')}` : ''}
    
    Guidelines:
    - Thank them for their time
    - Recap key points of interest they expressed
    - Address any questions or concerns raised
    - Clear next steps
    - Professional but warm tone
    
    Return subject line, email body, and next action.`,
    { investorName, meetingNotes, materialsToSend }
  );
}
