#!/usr/bin/env node
/**
 * Compile all investor research and outreach into a summary document
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, 'results');
const INVESTORS_FILE = join(__dirname, 'investors.json');

// Load investor categories
const investorsByCategory = JSON.parse(readFileSync(INVESTORS_FILE, 'utf-8'));

// Extract JSON from output (skip WARN lines)
function extractJson(content) {
  const match = content.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  return { success: false };
}

// Load results for an investor
function loadResults(name) {
  const safe = name.replace(/ /g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  try {
    const research = extractJson(readFileSync(join(RESULTS_DIR, `${safe}_research.json`), 'utf-8'));
    const outreach = extractJson(readFileSync(join(RESULTS_DIR, `${safe}_outreach.json`), 'utf-8'));
    return { research: research.data, outreach: outreach.data };
  } catch (e) {
    return null;
  }
}

// Generate markdown summary
let md = `# Runcible Investor Outreach Pipeline

Generated: ${new Date().toISOString().split('T')[0]}

Total Investors: 106

---

`;

const categoryNames = {
  strategic_alliances: 'Strategic Alliances',
  top_tier_vcs: 'Top Tier VCs',
  elite_firms: 'Elite Firms',
  defense_national_security: 'Defense & National Security',
  sovereign_wealth: 'Sovereign Wealth & Global Capital',
  specialized_ai: 'Specialized AI Firms',
  corporate_venture: 'Corporate Venture Arms',
  corporate_strategic_enterprise: 'Corporate Strategic (Enterprise)',
  corporate_strategic_hardware: 'Corporate Strategic (Hardware/Cloud)',
  corporate_strategic_financial: 'Corporate Strategic (Financial)',
  banking_insurance_consulting: 'Banking, Insurance & Consulting',
  multi_stage_investors: 'Multi-Stage Investors',
  accelerators: 'Accelerators',
  private_equity: 'Private Equity',
  strategic_individuals: 'Strategic Individuals',
  angel_investors: 'Angel Investors'
};

for (const [category, investors] of Object.entries(investorsByCategory)) {
  const catName = categoryNames[category] || category;
  md += `## ${catName}\n\n`;
  
  for (const inv of investors) {
    const results = loadResults(inv.name);
    if (!results) {
      md += `### ${inv.name}\n\n*Data not available*\n\n---\n\n`;
      continue;
    }
    
    const { research, outreach } = results;
    
    md += `### ${inv.name}\n\n`;
    
    if (research) {
      md += `**Type:** ${research.type || 'N/A'}\n\n`;
      md += `**Thesis:** ${research.thesis || 'N/A'}\n\n`;
      md += `**Check Size:** ${research.checkSize || 'N/A'}\n\n`;
      md += `**AI Governance Fit:** ${research.aiGovernanceFit || 'N/A'}\n\n`;
      
      if (research.portfolio?.length) {
        md += `**Portfolio:** ${research.portfolio.slice(0, 5).join(', ')}${research.portfolio.length > 5 ? '...' : ''}\n\n`;
      }
      
      if (research.recentNews?.length) {
        md += `**Recent News:**\n`;
        research.recentNews.forEach(n => md += `- ${n}\n`);
        md += '\n';
      }
      
      if (research.redFlags?.length) {
        md += `**Red Flags:**\n`;
        research.redFlags.forEach(f => md += `- ${f}\n`);
        md += '\n';
      }
      
      if (research.sources?.length) {
        md += `**Sources:** ${research.sources.slice(0, 3).join(', ')}\n\n`;
      }
    }
    
    if (outreach) {
      md += `#### Draft Outreach\n\n`;
      md += `**Subject:** ${outreach.subject || 'N/A'}\n\n`;
      md += `**Body:**\n\n${outreach.body || 'N/A'}\n\n`;
      md += `**Call to Action:** ${outreach.callToAction || 'N/A'}\n\n`;
    }
    
    md += `---\n\n`;
  }
}

// Write summary
writeFileSync(join(__dirname, 'OUTREACH_SUMMARY.md'), md);
console.log('Summary written to OUTREACH_SUMMARY.md');

// Also create a CSV for quick reference
let csv = 'Name,Type,AI Governance Fit,Check Size,Subject Line\n';
for (const investors of Object.values(investorsByCategory)) {
  for (const inv of investors) {
    const results = loadResults(inv.name);
    if (results?.research && results?.outreach) {
      const r = results.research;
      const o = results.outreach;
      csv += `"${inv.name}","${r.type || ''}","${r.aiGovernanceFit || ''}","${r.checkSize || ''}","${(o.subject || '').replace(/"/g, '""')}"\n`;
    }
  }
}
writeFileSync(join(__dirname, 'outreach_quick_ref.csv'), csv);
console.log('CSV written to outreach_quick_ref.csv');
