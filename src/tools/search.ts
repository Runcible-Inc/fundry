import { Exa, type SearchResult as ExaSearchResult } from 'exa-js';
import { execSync } from 'child_process';

let exaClient: InstanceType<typeof Exa> | null = null;

function getExaApiKey(): string {
  const envKey = process.env.EXA_API_KEY;
  if (envKey) return envKey;

  try {
    const key = execSync(
      'op read "op://Personal/Exa/API Key"',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return key;
  } catch {
    throw new Error(
      'EXA_API_KEY not set and could not read from 1Password.\n' +
      'Get an API key from https://exa.ai and store it in 1Password as "Exa" with field "API Key"'
    );
  }
}

function getClient(): InstanceType<typeof Exa> {
  if (!exaClient) {
    exaClient = new Exa(getExaApiKey());
  }
  return exaClient;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export async function webSearch(query: string, numResults: number = 5): Promise<SearchResult[]> {
  const client = getClient();
  
  const response = await client.searchAndContents(query, {
    numResults,
    text: { maxCharacters: 1000 },
    useAutoprompt: true,
  });

  return response.results.map((r) => ({
    title: r.title ?? 'Untitled',
    url: r.url,
    snippet: (r.text ?? '').slice(0, 500),
    publishedDate: r.publishedDate ?? undefined,
  }));
}

export async function searchInvestor(investorName: string): Promise<SearchResult[]> {
  const queries = [
    `${investorName} venture capital investments 2024 2025`,
    `${investorName} portfolio companies AI`,
    `${investorName} fund news recent`,
  ];

  const allResults: SearchResult[] = [];
  
  for (const query of queries) {
    try {
      const results = await webSearch(query, 3);
      allResults.push(...results);
    } catch (e) {
      console.error(`Search failed for query "${query}":`, e);
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return allResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}
