import { agentic } from '@symbolica/agentica';

export interface MeetingPrep {
  investorBackground: string;
  recentActivity: string[];
  talkingPoints: string[];
  anticipatedQuestions: string[];
  questionsToAsk: string[];
  potentialObjections: { objection: string; response: string }[];
  materialsToHave: string[];
}

export async function prepMeeting(
  investorName: string,
  meetingDate: string,
  meetingType: 'intro_call' | 'deep_dive' | 'partner_meeting' | 'final_diligence'
): Promise<MeetingPrep> {
  return await agentic(
    `Prepare a meeting brief for "${investorName}" on ${meetingDate}.
    
    Meeting type: ${meetingType}
    
    Runcible context:
    - "The Governance Layer for AI"
    - Truth-constrained, auditable, ethical AI
    - Target: finance, healthcare, defense, government
    - Raising: $20-30M USD
    - Founders: Curt Doolittle (leads), Moritz Bierling (Chief Business Officer, fundraising)
    
    Meeting type guidance:
    - intro_call: Focus on hook, problem, and why now
    - deep_dive: Technical differentiation, market size, competitive moat
    - partner_meeting: Full story, team, traction, ask
    - final_diligence: Address specific concerns, terms discussion
    
    Provide:
    - Brief investor background
    - Their recent activity/investments
    - Key talking points for this stage
    - Questions they're likely to ask
    - Questions we should ask them
    - Potential objections and how to handle them
    - Materials to have ready`,
    { investorName, meetingDate, meetingType }
  );
}
