import { agentic } from '@symbolica/agentica';
import { searchInvestor, type SearchResult } from './search.js';

export interface InvestorBrief {
  name: string;
  type: 'vc' | 'strategic' | 'angel' | 'family_office' | 'unknown';
  thesis: string;
  portfolio: string[];
  checkSize: string;
  relevantConnections: string[];
  aiGovernanceFit: 'high' | 'medium' | 'low';
  redFlags: string[];
  recentNews: string[];
  sources: string[];
}

export async function researchInvestor(investorName: string): Promise<InvestorBrief> {
  // First, search the web for current information
  let searchResults: SearchResult[] = [];
  try {
    searchResults = await searchInvestor(investorName);
  } catch (e) {
    // Continue without web search if it fails (e.g., no API key)
    console.error('Web search unavailable:', e instanceof Error ? e.message : e);
  }

  const searchContext = searchResults.length > 0
    ? `\n\nWeb search results (use these for current information):\n${searchResults.map((r, i) => 
        `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.publishedDate ? `Date: ${r.publishedDate}\n    ` : ''}${r.snippet}`
      ).join('\n\n')}`
    : '\n\n(No web search results available - use your training data)';

  return await agentic(
    `Research the investor or firm "${investorName}" for a fundraising context.
    
    Context: We are Runcible, "The Governance Layer for AI" - providing truth-constrained, 
    auditable, ethical AI for high-stakes use cases (finance, healthcare, defense, government).
    We're raising $20-30M.
    ${searchContext}
    
    Provide a structured research brief including:
    - Investor type classification
    - Their investment thesis
    - Notable portfolio companies (especially AI/enterprise)
    - Typical check size range
    - Any connections or warm intro paths we might leverage
    - How well they align with AI governance/safety themes
    - Any red flags or concerns
    - Recent news or activity (prioritize info from web search results)
    - Sources (list URLs from search results that informed your response)`,
    { investorName, searchResults }
  );
}

export async function assessFit(investorName: string): Promise<{
  rating: 'high' | 'medium' | 'low';
  reasoning: string;
  priorityTier: 1 | 2 | 3;
}> {
  return await agentic(
    `Assess how well "${investorName}" fits as an investor for Runcible.
    
    Runcible profile:
    - "The Governance Layer for AI"
    - Truth-constrained, auditable, ethical AI
    - Target verticals: finance, healthcare, defense, government
    - Raising: $20-30M USD
    - Differentiation: Built on Natural Law Institute science of decidability
    
    Tier definitions:
    - Tier 1 (priorityTier: 1): Strategic alliances - Microsoft, Amazon, X.ai type
    - Tier 2 (priorityTier: 2): Top-tier VCs with AI governance thesis alignment
    - Tier 3 (priorityTier: 3): Active AI investors, broader outreach
    
    Return a fit assessment with rating, reasoning, and priority tier.`,
    { investorName }
  );
}
