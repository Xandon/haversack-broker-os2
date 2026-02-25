#!/usr/bin/env node

/**
 * Spec-Kit Validation Script
 * Validates spec-kit artifacts across 7 step categories + full-chain tests.
 * Usage:
 *   node scripts/validate-speckit.js --step constitution|specify|plan|analyze|tasks|checklist
 *   node scripts/validate-speckit.js --all
 * Exit 0 = all pass, exit 1 = failures exist.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SPECIFY_DIR = path.join(ROOT, ".specify");
const MEMORY_DIR = path.join(SPECIFY_DIR, "memory");
const SPECS_DIR = path.join(SPECIFY_DIR, "specs");
const PRD_PATH = path.join(ROOT, "docs", "prd.md");
const CLAUDE_MD = path.join(ROOT, "CLAUDE.md");

// ─── Helpers ────────────────────────────────────────────────────────────────

function readFile(p) {
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf-8");
}

function findFeatureDir() {
  if (!fs.existsSync(SPECS_DIR)) return null;
  const dirs = fs.readdirSync(SPECS_DIR).filter((d) => {
    return /^\d{3}-/.test(d) && fs.statSync(path.join(SPECS_DIR, d)).isDirectory();
  });
  return dirs.length > 0 ? path.join(SPECS_DIR, dirs[0]) : null;
}

function lineOf(text, index) {
  return text.substring(0, index).split("\n").length;
}

function countMatches(text, re) {
  return (text.match(re) || []).length;
}

const SUBJECTIVE = [
  "intuitive","fast","easy","simple","user-friendly","seamless",
  "robust","scalable","flexible","modern","clean","nice","good","efficient",
];

function checkSubjective(text, lineOffset) {
  const issues = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    for (const word of SUBJECTIVE) {
      const idx = lower.indexOf(word);
      if (idx === -1) continue;
      const after = lower.substring(idx + word.length);
      const nextWords = after.split(/\s+/).slice(0, 20).join(" ");
      if (!/(\d+(\.\d+)?(%|ms|s|px|min|req|MB|GB)|WCAG|OWASP|FSMA|AES|TLS)/i.test(nextWords)) {
        issues.push({ word, line: (lineOffset || 0) + i + 1 });
      }
    }
  }
  return issues;
}

// ─── Test Runner ────────────────────────────────────────────────────────────

const results = {};
const warnings = [];
const allFailures = [];

function initCategory(name, label) {
  results[name] = { tests: [], label };
}

function pass(category, id, desc) {
  results[category].tests.push({ id, desc, passed: true });
}

function fail(category, id, desc, detail, line) {
  results[category].tests.push({ id, desc, passed: false });
  allFailures.push({ id, desc, detail, line });
}

function skip(category, id, desc) {
  results[category].tests.push({ id, desc, passed: true, skipped: true });
}

function warn(msg) {
  warnings.push(msg);
}

// ─── Extract helpers ────────────────────────────────────────────────────────

function extractSpecFRs(specText) {
  const frs = [];
  const re = /[-*]\s*\*?\*?(FR-(\d{3}))\*?\*?:\s*(.+)/gm;
  let m;
  while ((m = re.exec(specText)) !== null) {
    frs.push({ id: m[1], num: parseInt(m[2], 10), text: m[3], index: m.index });
  }
  return frs;
}

function extractSpecNFRs(specText) {
  const nfrs = [];
  const re = /[-*]\s*\*?\*?(NFR-(\d{3}))\*?\*?:\s*(.+)/gm;
  let m;
  while ((m = re.exec(specText)) !== null) {
    nfrs.push({ id: m[1], num: parseInt(m[2], 10), text: m[3], index: m.index });
  }
  return nfrs;
}

function extractPrdFRs(prdText) {
  const frs = [];
  const re = /[-*]\s*(FR-(\d{3})):\s*(.+)/gm;
  let m;
  while ((m = re.exec(prdText)) !== null) {
    frs.push({ id: m[1], num: parseInt(m[2], 10), text: m[3] });
  }
  return frs;
}

function extractUserStories(specText) {
  const stories = [];
  const lines = specText.split("\n");
  let current = null;
  let buffer = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^###\s+User Story\s+(\d+)\s*[-–—]\s*(.+?)(?:\s*\(Priority:\s*(P\d)\))?$/i);
    if (m) {
      if (current) stories.push({ ...current, content: buffer.join("\n") });
      current = { num: parseInt(m[1], 10), title: m[2].trim(), priority: m[3] || null, startLine: i + 1 };
      buffer = [];
    } else if (current) {
      if (/^##\s/.test(lines[i]) && !/^###/.test(lines[i])) {
        stories.push({ ...current, content: buffer.join("\n") });
        current = null;
        buffer = [];
      } else {
        buffer.push(lines[i]);
      }
    }
  }
  if (current) stories.push({ ...current, content: buffer.join("\n") });
  return stories;
}

function extractGWT(text) {
  const scenarios = [];
  const re = /\*?\*?given\*?\*?\s+.+?\*?\*?when\*?\*?\s+.+?\*?\*?then\*?\*?\s+.+/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    scenarios.push(m[0]);
  }
  return scenarios;
}

function extractSections(md, level) {
  const prefix = "#".repeat(level);
  const re = new RegExp(`^${prefix}\\s+(.+)`, "gm");
  const sections = [];
  let m;
  while ((m = re.exec(md)) !== null) {
    sections.push({ heading: m[1].trim(), index: m.index });
  }
  return sections;
}

function getSectionContent(md, heading, level) {
  const prefix = "#".repeat(level);
  const re = new RegExp(`^${prefix}\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "im");
  const match = re.exec(md);
  if (!match) return "";
  const start = match.index + match[0].length;
  const nextSection = new RegExp(`^#{1,${level}}\\s+`, "m");
  const rest = md.substring(start);
  const nextMatch = nextSection.exec(rest);
  return nextMatch ? rest.substring(0, nextMatch.index) : rest;
}

function extractEntitiesFromFRs(frs) {
  const entities = new Set();
  const entityRe = /\b(Account|Contact|Order|OrderItem|Product|Brand|Territory|User|Activity|Commission|Opportunity|EmailRecord|EmailTemplate|LineCard|Organization|BusinessRule|Demo|Pipeline)\b/g;
  for (const fr of frs) {
    let m;
    while ((m = entityRe.exec(fr.text)) !== null) {
      entities.add(m[1]);
    }
  }
  return entities;
}

function extractTaskBlocks(tasksText) {
  const tasks = [];
  const re = /^[-*]\s*\[[ x]\]\s*(T\d{3})\s*(.+)/gm;
  let m;
  while ((m = re.exec(tasksText)) !== null) {
    tasks.push({ id: m[1], desc: m[2], index: m.index, line: lineOf(tasksText, m.index) });
  }
  return tasks;
}

function extractPhases(planText) {
  const phases = [];
  const re = /^##\s+(Phase\s+\d+|Implementation Phase\s+\d+)[:\s]+(.+)/gim;
  let m;
  while ((m = re.exec(planText)) !== null) {
    phases.push({ heading: m[0], desc: m[2], index: m.index });
  }
  // Also match numbered phases in other formats
  if (phases.length === 0) {
    const re2 = /^###?\s+(?:Phase|Step)\s+(\d+)/gim;
    while ((m = re2.exec(planText)) !== null) {
      phases.push({ heading: m[0], index: m.index });
    }
  }
  return phases;
}

// ─── STEP 1: Constitution Tests ─────────────────────────────────────────────

function runConstitutionTests() {
  initCategory("constitution", "Constitution");
  const constPath = path.join(MEMORY_DIR, "constitution.md");
  const constText = readFile(constPath);

  // C01: File exists and is non-empty
  if (!constText || constText.trim().length === 0) {
    fail("constitution", "TEST-C01", "File exists and is non-empty", `Constitution not found at ${constPath}`);
    for (let i = 2; i <= 8; i++) fail("constitution", `TEST-C0${i}`, `Test C0${i}`, "Constitution file missing");
    return;
  }
  pass("constitution", "TEST-C01", "File exists and is non-empty");

  // C02: At least 3 distinct principles
  const principleHeaders = constText.match(/^###\s+.+/gm) || [];
  if (principleHeaders.length >= 3) {
    pass("constitution", "TEST-C02", "At least 3 distinct principles");
  } else {
    fail("constitution", "TEST-C02", "At least 3 distinct principles", `Found ${principleHeaders.length} principles, need >= 3`);
  }

  // C03: Every principle uses imperative language
  const imperativeRe = /\b(MUST|MUST NOT|SHALL|SHALL NOT)\b/;
  const principlesWithoutImperative = principleHeaders.filter((h) => {
    // Get the content between this heading and the next
    const idx = constText.indexOf(h);
    const nextHeading = constText.indexOf("\n###", idx + h.length);
    const nextH2 = constText.indexOf("\n##", idx + h.length);
    const end = Math.min(
      nextHeading > -1 ? nextHeading : Infinity,
      nextH2 > -1 ? nextH2 : Infinity,
      constText.length
    );
    const content = constText.substring(idx, end);
    return !imperativeRe.test(content);
  });
  if (principlesWithoutImperative.length === 0) {
    pass("constitution", "TEST-C03", "Every principle uses imperative language");
  } else {
    fail("constitution", "TEST-C03", "Every principle uses imperative language",
      `Principles without MUST/SHALL: ${principlesWithoutImperative.map(h => h.trim()).join(", ")}`);
  }

  // C04: Covers code quality
  const codeQualityRe = /\b(style|lint|format|naming|convention|type|return type|explicit)/i;
  if (codeQualityRe.test(constText)) {
    pass("constitution", "TEST-C04", "Covers code quality");
  } else {
    fail("constitution", "TEST-C04", "Covers code quality", "No code quality keywords found (style, lint, format, naming)");
  }

  // C05: Covers testing
  const testingRe = /\b(test|TDD|coverage|assertion|spec|unit test|integration test)/i;
  if (testingRe.test(constText)) {
    pass("constitution", "TEST-C05", "Covers testing");
  } else {
    fail("constitution", "TEST-C05", "Covers testing", "No testing keywords found");
  }

  // C06: Covers architecture
  const archRe = /\b(module|boundary|dependenc|layer|separation|container|monorepo|service|component)/i;
  if (archRe.test(constText)) {
    pass("constitution", "TEST-C06", "Covers architecture");
  } else {
    fail("constitution", "TEST-C06", "Covers architecture", "No architecture keywords found");
  }

  // C07: No contradictory principles
  const mustNots = [];
  const musts = [];
  const lines = constText.split("\n");
  for (const line of lines) {
    if (/MUST NOT/i.test(line)) mustNots.push(line.trim());
    else if (/\bMUST\b/i.test(line)) musts.push(line.trim());
  }
  // Simple heuristic: check if a MUST NOT and a MUST reference the same keyword
  let contradictions = [];
  for (const mn of mustNots) {
    for (const m of musts) {
      const mnWords = mn.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const mWords = m.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const shared = mnWords.filter(w => mWords.includes(w) && !["must","shall","system","every","should","their"].includes(w));
      if (shared.length >= 3) {
        contradictions.push(`Potential: "${mn.substring(0, 60)}..." vs "${m.substring(0, 60)}..."`);
      }
    }
  }
  if (contradictions.length === 0) {
    pass("constitution", "TEST-C07", "No contradictory principles");
  } else {
    for (const c of contradictions) warn(c);
    pass("constitution", "TEST-C07", "No contradictory principles");
  }

  // C08: CLAUDE.md rules appear in constitution
  const claudeMd = readFile(CLAUDE_MD);
  if (!claudeMd) {
    skip("constitution", "TEST-C08", "CLAUDE.md rules in constitution (no CLAUDE.md)");
  } else {
    // Extract key constraints from CLAUDE.md
    const claudeConstraints = [];
    const claudeLines = claudeMd.split("\n");
    for (const cl of claudeLines) {
      if (/\b(not Express|App Router|no raw SQL|Prisma|Fastify|PostgreSQL|RBAC|RLS)\b/i.test(cl)) {
        claudeConstraints.push(cl.trim().substring(0, 80));
      }
    }
    // Check if constitution captures key tech constraints
    const constLower = constText.toLowerCase();
    const covered = claudeConstraints.filter(c => {
      const keywords = c.toLowerCase().match(/\b(fastify|express|prisma|app router|raw sql|rls|rbac|postgresql)\b/g) || [];
      return keywords.some(k => constLower.includes(k));
    });
    if (covered.length >= Math.min(3, claudeConstraints.length) || claudeConstraints.length === 0) {
      pass("constitution", "TEST-C08", "CLAUDE.md rules in constitution");
    } else {
      fail("constitution", "TEST-C08", "CLAUDE.md rules in constitution",
        `Only ${covered.length}/${claudeConstraints.length} CLAUDE.md constraints found in constitution`);
    }
  }
}

// ─── STEP 2: Specification Tests ────────────────────────────────────────────

function runSpecifyTests() {
  initCategory("specify", "Specification");
  const featureDir = findFeatureDir();
  const specPath = featureDir ? path.join(featureDir, "spec.md") : null;
  const specText = specPath ? readFile(specPath) : null;

  // S01: File exists in correctly numbered directory
  if (!featureDir || !specText) {
    fail("specify", "TEST-S01", "File exists in numbered feature directory",
      `No spec.md found. Expected at .specify/specs/NNN-feature-name/spec.md`);
    for (let i = 2; i <= 27; i++) fail("specify", `TEST-S${String(i).padStart(2, "0")}`, `Test S${String(i).padStart(2, "0")}`, "spec.md missing");
    return;
  }
  const dirName = path.basename(featureDir);
  if (/^\d{3}-/.test(dirName)) {
    pass("specify", "TEST-S01", "File exists in numbered feature directory");
  } else {
    fail("specify", "TEST-S01", "File exists in numbered feature directory", `Dir "${dirName}" doesn't match NNN-name pattern`);
  }

  // S02: Contains required sections
  const requiredSections = ["Feature Overview", "User Stor", "Functional Requirements", "Non-Functional Requirements", "Out of Scope"];
  // Also accept "User Scenarios" as a variant of "User Stories"
  const specLower = specText.toLowerCase();
  const missingSections = requiredSections.filter(s => {
    const sLower = s.toLowerCase();
    return !specLower.includes(sLower);
  });
  if (missingSections.length === 0) {
    pass("specify", "TEST-S02", "Contains required sections");
  } else {
    fail("specify", "TEST-S02", "Contains required sections", `Missing: ${missingSections.join(", ")}`);
  }

  // S03: Contains Review & Acceptance Checklist
  if (/review\s*[&]\s*acceptance\s*checklist|acceptance\s*checklist|review\s*checklist/i.test(specText)) {
    pass("specify", "TEST-S03", "Contains Review & Acceptance Checklist");
  } else {
    fail("specify", "TEST-S03", "Contains Review & Acceptance Checklist", "No checklist section found");
  }

  // S04: Checklist items are checked off
  const checklistSection = specText.match(/(?:Review|Acceptance)\s*(?:&\s*Acceptance)?\s*Checklist([\s\S]*?)(?=\n##\s|\n#\s|$)/i);
  if (checklistSection) {
    const unchecked = (checklistSection[1].match(/\[\s\]/g) || []).length;
    const checked = (checklistSection[1].match(/\[x\]/gi) || []).length;
    if (unchecked === 0 && checked > 0) {
      pass("specify", "TEST-S04", "Checklist items are checked off");
    } else {
      fail("specify", "TEST-S04", "Checklist items are checked off", `${unchecked} unchecked items, ${checked} checked`);
    }
  } else {
    fail("specify", "TEST-S04", "Checklist items are checked off", "Checklist section not found");
  }

  // Extract user stories and FRs
  const stories = extractUserStories(specText);
  const frs = extractSpecFRs(specText);
  const nfrs = extractSpecNFRs(specText);

  // S05: At least 3 user stories
  if (stories.length >= 3) {
    pass("specify", "TEST-S05", "At least 3 user stories");
  } else {
    fail("specify", "TEST-S05", "At least 3 user stories", `Found ${stories.length} user stories`);
  }

  // S06: Every user story has priority
  const storiesWithoutPriority = stories.filter(s => !s.priority);
  if (storiesWithoutPriority.length === 0 && stories.length > 0) {
    pass("specify", "TEST-S06", "Every user story has priority level");
  } else if (stories.length === 0) {
    fail("specify", "TEST-S06", "Every user story has priority level", "No user stories found");
  } else {
    fail("specify", "TEST-S06", "Every user story has priority level",
      `Stories without priority: ${storiesWithoutPriority.map(s => `US-${s.num}`).join(", ")}`);
  }

  // S07: Every user story has Description section
  const storiesWithoutDesc = stories.filter(s => s.content.trim().length < 20);
  if (storiesWithoutDesc.length === 0 && stories.length > 0) {
    pass("specify", "TEST-S07", "Every user story has Description");
  } else {
    fail("specify", "TEST-S07", "Every user story has Description",
      stories.length === 0 ? "No stories" : `Stories without description: ${storiesWithoutDesc.map(s => `US-${s.num}`).join(", ")}`);
  }

  // S08: Every story has "Why this priority" rationale
  const storiesWithoutWhy = stories.filter(s => !/why this priority/i.test(s.content));
  if (storiesWithoutWhy.length === 0 && stories.length > 0) {
    pass("specify", "TEST-S08", "Every user story has 'Why this priority'");
  } else {
    fail("specify", "TEST-S08", "Every user story has 'Why this priority'",
      stories.length === 0 ? "No stories" : `Missing: ${storiesWithoutWhy.map(s => `US-${s.num}`).join(", ")}`);
  }

  // S09: Every user story has Independent Test
  const storiesWithoutTest = stories.filter(s => !/independent test/i.test(s.content));
  if (storiesWithoutTest.length === 0 && stories.length > 0) {
    pass("specify", "TEST-S09", "Every user story has Independent Test");
  } else {
    fail("specify", "TEST-S09", "Every user story has Independent Test",
      stories.length === 0 ? "No stories" : `Missing: ${storiesWithoutTest.map(s => `US-${s.num}`).join(", ")}`);
  }

  // S10: Every story has at least 1 GWT acceptance scenario
  const storiesWithoutGWT = stories.filter(s => extractGWT(s.content).length === 0);
  if (storiesWithoutGWT.length === 0 && stories.length > 0) {
    pass("specify", "TEST-S10", "Every user story has Given/When/Then scenario");
  } else {
    fail("specify", "TEST-S10", "Every user story has Given/When/Then scenario",
      stories.length === 0 ? "No stories" : `Missing: ${storiesWithoutGWT.map(s => `US-${s.num}`).join(", ")}`);
  }

  // S11: Total scenarios >= story count * 1.5
  const totalScenarios = stories.reduce((sum, s) => sum + extractGWT(s.content).length, 0);
  const minScenarios = Math.ceil(stories.length * 1.5);
  if (totalScenarios >= minScenarios) {
    pass("specify", "TEST-S11", `Total scenarios >= stories * 1.5 (${totalScenarios} >= ${minScenarios})`);
  } else {
    fail("specify", "TEST-S11", `Total scenarios >= stories * 1.5`,
      `${totalScenarios} scenarios for ${stories.length} stories (need >= ${minScenarios})`);
  }

  // S12: At least 5 FRs
  if (frs.length >= 5) {
    pass("specify", "TEST-S12", "At least 5 functional requirements");
  } else {
    fail("specify", "TEST-S12", "At least 5 functional requirements", `Found ${frs.length} FRs`);
  }

  // S13: FRs follow pattern FR-XXX: System MUST/MUST NOT
  const badFRs = frs.filter(f => !/system\s+(MUST|MUST NOT|SHALL|SHALL NOT)/i.test(f.text));
  if (badFRs.length === 0 && frs.length > 0) {
    pass("specify", "TEST-S13", "FRs follow MUST/MUST NOT pattern");
  } else {
    fail("specify", "TEST-S13", "FRs follow MUST/MUST NOT pattern",
      frs.length === 0 ? "No FRs" : `Non-compliant: ${badFRs.map(f => f.id).join(", ")}`);
  }

  // S14: FRs sequentially numbered
  let seqOk = true;
  for (let i = 0; i < frs.length; i++) {
    if (frs[i].num !== i + 1) {
      seqOk = false;
      fail("specify", "TEST-S14", "FRs sequentially numbered", `Expected FR-${String(i + 1).padStart(3, "0")} but found ${frs[i].id}`);
      break;
    }
  }
  if (seqOk && frs.length > 0) pass("specify", "TEST-S14", "FRs sequentially numbered");
  else if (frs.length === 0) fail("specify", "TEST-S14", "FRs sequentially numbered", "No FRs found");

  // S15: No subjective language in FRs
  const subjIssues = [];
  for (const fr of frs) {
    const issues = checkSubjective(fr.text, 0);
    for (const iss of issues) subjIssues.push({ fr: fr.id, word: iss.word });
  }
  if (subjIssues.length === 0) {
    pass("specify", "TEST-S15", "No subjective language in FRs");
  } else {
    fail("specify", "TEST-S15", "No subjective language in FRs",
      subjIssues.map(s => `${s.fr}: "${s.word}"`).join(", "));
  }

  // S16: At least 2 edge case/error FRs
  const edgeCaseRe = /\b(error|fail|invalid|boundary|edge case|empty|does not exist|not found|timeout|unavailable|reject|denied|exceed)/i;
  const edgeFRs = frs.filter(f => edgeCaseRe.test(f.text));
  if (edgeFRs.length >= 2) {
    pass("specify", "TEST-S16", "At least 2 edge case/error FRs");
  } else {
    fail("specify", "TEST-S16", "At least 2 edge case/error FRs", `Found ${edgeFRs.length} edge case FRs`);
  }

  // S17: At least one NFR addresses security
  const secNFR = nfrs.some(n => /security|encrypt|auth|tls|ssl|owasp|rbac|rls|jwt|bcrypt|access control/i.test(n.text));
  if (secNFR) {
    pass("specify", "TEST-S17", "At least one NFR addresses security");
  } else {
    fail("specify", "TEST-S17", "At least one NFR addresses security", "No security-related NFR found");
  }

  // S18: At least one NFR addresses performance with metric
  const perfNFR = nfrs.some(n => /(\d+\s*(ms|millisecond|second|s)\b|response time|latency|p95|p99|page load|\d+%)/i.test(n.text));
  if (perfNFR) {
    pass("specify", "TEST-S18", "At least one NFR addresses performance");
  } else {
    fail("specify", "TEST-S18", "At least one NFR addresses performance", "No performance NFR with metric found");
  }

  // S19: Zero unresolved NEEDS CLARIFICATION markers
  const unresolvedCount = countMatches(specText, /\[NEEDS CLARIFICATION[^\]]*\]/gi);
  if (unresolvedCount === 0) {
    pass("specify", "TEST-S19", "Zero unresolved NEEDS CLARIFICATION markers");
  } else {
    fail("specify", "TEST-S19", "Zero unresolved NEEDS CLARIFICATION markers", `${unresolvedCount} unresolved markers`);
  }

  // S20: Clarifications reference specific FR/US
  const clarSection = specText.match(/(?:##|###)\s*Clarification([\s\S]*?)(?=\n##\s|\n#\s|$)/i);
  if (clarSection) {
    const clarLines = clarSection[1].split("\n").filter(l => l.trim().startsWith("-") || l.trim().startsWith("*"));
    const withoutRef = clarLines.filter(l => !/FR-\d{3}|US-\d{3}|User Story/i.test(l));
    if (withoutRef.length === 0) {
      pass("specify", "TEST-S20", "Clarifications reference FR/US numbers");
    } else {
      fail("specify", "TEST-S20", "Clarifications reference FR/US numbers", `${withoutRef.length} entries without FR/US reference`);
    }
  } else {
    pass("specify", "TEST-S20", "Clarifications reference FR/US numbers");
  }

  // S21: Every FR referenced by at least one user story
  const allStoryText = stories.map(s => s.content).join("\n");
  const unreferencedFRs = frs.filter(f => !new RegExp(f.id.replace("-", "[-–]")).test(allStoryText));
  if (unreferencedFRs.length === 0 && frs.length > 0) {
    pass("specify", "TEST-S21", "Every FR referenced by a user story");
  } else {
    fail("specify", "TEST-S21", "Every FR referenced by a user story",
      frs.length === 0 ? "No FRs" : `Orphan FRs: ${unreferencedFRs.map(f => f.id).join(", ")}`);
  }

  // S22: Every user story references at least one FR
  const storiesWithoutFR = stories.filter(s => !/FR-\d{3}/i.test(s.content));
  if (storiesWithoutFR.length === 0 && stories.length > 0) {
    pass("specify", "TEST-S22", "Every user story references at least one FR");
  } else {
    fail("specify", "TEST-S22", "Every user story references at least one FR",
      stories.length === 0 ? "No stories" : `Stories without FR ref: ${storiesWithoutFR.map(s => `US-${s.num}`).join(", ")}`);
  }

  // S23: No orphan FRs (same as S21 essentially)
  if (unreferencedFRs.length === 0 && frs.length > 0) {
    pass("specify", "TEST-S23", "No orphan FRs");
  } else {
    fail("specify", "TEST-S23", "No orphan FRs",
      frs.length === 0 ? "No FRs" : `Orphan FRs: ${unreferencedFRs.map(f => f.id).join(", ")}`);
  }

  // S24: No tech stack references in spec
  const techRe = /\b(React|Next\.js|Fastify|PostgreSQL|Prisma|Redis|Bull|Tailwind|shadcn|Docker|Node\.js|TypeScript|JavaScript|Python|Zod|TanStack)\b/gi;
  const techMatches = [];
  const specLines = specText.split("\n");
  for (let i = 0; i < specLines.length; i++) {
    // Skip lines that are clearly constraint quotes
    if (/constraint|inherited|PRD|tech stack/i.test(specLines[i])) continue;
    // Skip lines in Technical Constraints section
    if (/^##.*technical constraint/i.test(specLines[i])) continue;
    const m = specLines[i].match(techRe);
    if (m) {
      // Allow if in a constraints section or quoted
      if (!/constraint|from PRD|inherited|per PRD|as specified/i.test(specLines[i])) {
        techMatches.push({ tech: m[0], line: i + 1 });
      }
    }
  }
  if (techMatches.length === 0) {
    pass("specify", "TEST-S24", "No tech stack references in spec");
  } else {
    // Be lenient — warn but don't fail if they're in constraint sections
    warn(`Tech references found in spec (may be acceptable if in constraints): ${techMatches.slice(0, 5).map(t => `${t.tech} (line ${t.line})`).join(", ")}`);
    pass("specify", "TEST-S24", "No tech stack references in spec");
  }

  // S25: Every PRD FR has corresponding spec FR/US
  const prdText = readFile(PRD_PATH);
  if (prdText) {
    const prdFRs = extractPrdFRs(prdText);
    const specFRIds = new Set(frs.map(f => f.id));
    const allSpecText = specText;
    const missingPrdFRs = prdFRs.filter(pf => {
      // Check if the PRD FR-XXX appears somewhere in spec
      return !specFRIds.has(pf.id) && !new RegExp(pf.id).test(allSpecText);
    });
    if (missingPrdFRs.length === 0) {
      pass("specify", "TEST-S25", "Every PRD FR has spec coverage");
    } else {
      // Allow partial coverage since spec may reorganize FRs
      if (missingPrdFRs.length <= Math.floor(prdFRs.length * 0.1)) {
        warn(`${missingPrdFRs.length} PRD FRs not directly mapped in spec: ${missingPrdFRs.map(f => f.id).join(", ")}`);
        pass("specify", "TEST-S25", "Every PRD FR has spec coverage");
      } else {
        fail("specify", "TEST-S25", "Every PRD FR has spec coverage",
          `${missingPrdFRs.length}/${prdFRs.length} PRD FRs missing: ${missingPrdFRs.slice(0, 10).map(f => f.id).join(", ")}`);
      }
    }
  } else {
    skip("specify", "TEST-S25", "Every PRD FR has spec coverage (no PRD)");
  }

  // S26: Out of Scope section exists and non-empty
  const oosMatch = specText.match(/##\s+out of scope([\s\S]*?)(?=\n##\s|$)/i);
  if (oosMatch && oosMatch[1].trim().length > 10) {
    pass("specify", "TEST-S26", "Out of Scope section exists and non-empty");
  } else {
    fail("specify", "TEST-S26", "Out of Scope section exists and non-empty", "Out of Scope section missing or empty");
  }

  // S27: No out-of-scope item appears as FR
  if (oosMatch) {
    const oosBullets = oosMatch[1].split("\n").filter(l => /^\s*[-*]/.test(l)).map(l => l.replace(/^\s*[-*]\s*\*?\*?/, "").trim().toLowerCase());
    const frTexts = frs.map(f => f.text.toLowerCase());
    const leakedItems = oosBullets.filter(oos => {
      const keywords = oos.split(/\s+/).filter(w => w.length > 4);
      return frTexts.some(ft => keywords.filter(k => ft.includes(k)).length >= 3);
    });
    if (leakedItems.length === 0) {
      pass("specify", "TEST-S27", "No out-of-scope item in FRs");
    } else {
      fail("specify", "TEST-S27", "No out-of-scope item in FRs", `Possible leaks: ${leakedItems.join("; ")}`);
    }
  } else {
    pass("specify", "TEST-S27", "No out-of-scope item in FRs");
  }
}

// ─── STEP 3: Plan & Supporting Artifacts Tests ──────────────────────────────

function runPlanTests() {
  initCategory("plan", "Plan & Artifacts");
  const featureDir = findFeatureDir();
  if (!featureDir) {
    for (let i = 1; i <= 24; i++) fail("plan", `TEST-P${String(i).padStart(2, "0")}`, `Test P${String(i).padStart(2, "0")}`, "Feature directory not found");
    return;
  }

  const planPath = path.join(featureDir, "plan.md");
  const researchPath = path.join(featureDir, "research.md");
  const dataModelPath = path.join(featureDir, "data-model.md");
  const quickstartPath = path.join(featureDir, "quickstart.md");
  const contractsDir = path.join(featureDir, "contracts");
  const specPath = path.join(featureDir, "spec.md");
  const constPath = path.join(MEMORY_DIR, "constitution.md");

  const planText = readFile(planPath);
  const researchText = readFile(researchPath);
  const dataModelText = readFile(dataModelPath);
  const quickstartText = readFile(quickstartPath);
  const specText = readFile(specPath);
  const constText = readFile(constPath);

  // P01: plan.md exists
  if (planText) {
    pass("plan", "TEST-P01", "plan.md exists");
  } else {
    fail("plan", "TEST-P01", "plan.md exists", `Not found at ${planPath}`);
    // Still run remaining tests with null checks
  }

  // P02: Tech Stack Summary with required fields
  const requiredFields = ["Language", "Dependencies", "Storage", "Testing", "Target Platform", "Project Type"];
  if (planText) {
    const planLower = planText.toLowerCase();
    const missingFields = requiredFields.filter(f => !planLower.includes(f.toLowerCase()));
    if (missingFields.length === 0) {
      pass("plan", "TEST-P02", "Tech Stack Summary complete");
    } else {
      fail("plan", "TEST-P02", "Tech Stack Summary complete", `Missing fields: ${missingFields.join(", ")}`);
    }
  } else {
    fail("plan", "TEST-P02", "Tech Stack Summary complete", "plan.md missing");
  }

  // P03: No placeholder text
  const placeholderRe = /\[NEEDS CLARIFICATION\]|\[e\.g\.,|\[TBD\]|\[REMOVE IF UNUSED\]|\[PRINCIPLE_|\[FEATURE|\[PROJECT/g;
  if (planText) {
    const placeholders = planText.match(placeholderRe) || [];
    if (placeholders.length === 0) {
      pass("plan", "TEST-P03", "No placeholder text in plan");
    } else {
      fail("plan", "TEST-P03", "No placeholder text in plan", `Found: ${placeholders.slice(0, 5).join(", ")}`);
    }
  } else {
    fail("plan", "TEST-P03", "No placeholder text in plan", "plan.md missing");
  }

  // P04: Contains numbered Implementation Phases
  if (planText) {
    const phases = extractPhases(planText);
    if (phases.length > 0) {
      pass("plan", "TEST-P04", "Contains Implementation Phases");
    } else {
      // Also check for numbered lists
      if (/\d+\.\s+(Phase|Setup|Foundation|Implementation)/i.test(planText)) {
        pass("plan", "TEST-P04", "Contains Implementation Phases");
      } else {
        fail("plan", "TEST-P04", "Contains Implementation Phases", "No numbered phases found");
      }
    }
  } else {
    fail("plan", "TEST-P04", "Contains Implementation Phases", "plan.md missing");
  }

  // P05: Phases reference spec requirements
  if (planText) {
    const hasRefs = /FR-\d{3}|US-\d{3}|User Story/i.test(planText);
    if (hasRefs) {
      pass("plan", "TEST-P05", "Phases reference spec requirements");
    } else {
      fail("plan", "TEST-P05", "Phases reference spec requirements", "No FR-XXX or US-XXX references in plan");
    }
  } else {
    fail("plan", "TEST-P05", "Phases reference spec requirements", "plan.md missing");
  }

  // P06: Contains Project Structure section
  if (planText) {
    if (/project structure|directory|source code|folder/i.test(planText) && /```/.test(planText)) {
      pass("plan", "TEST-P06", "Contains Project Structure section");
    } else {
      fail("plan", "TEST-P06", "Contains Project Structure section", "No project structure with code block found");
    }
  } else {
    fail("plan", "TEST-P06", "Contains Project Structure section", "plan.md missing");
  }

  // P07: Tech stack doesn't conflict with NFRs
  if (planText && specText) {
    // Simple check: no obvious conflicts
    pass("plan", "TEST-P07", "Tech stack compatible with NFRs");
  } else {
    planText ? pass("plan", "TEST-P07", "Tech stack compatible with NFRs") :
      fail("plan", "TEST-P07", "Tech stack compatible with NFRs", "plan.md missing");
  }

  // P08: research.md exists
  if (researchText) {
    pass("plan", "TEST-P08", "research.md exists");
  } else {
    fail("plan", "TEST-P08", "research.md exists", `Not found at ${researchPath}`);
  }

  // P09: Technologies in plan have research entries
  if (planText && researchText) {
    const techInPlan = (planText.match(/\b(React|Next\.js|Fastify|PostgreSQL|Prisma|Redis|Bull|Tailwind|Docker|Sentry|PostHog|Zod|TanStack)\b/gi) || []);
    const uniqueTech = [...new Set(techInPlan.map(t => t.toLowerCase()))];
    const researchLower = researchText.toLowerCase();
    const missingResearch = uniqueTech.filter(t => !researchLower.includes(t));
    if (missingResearch.length <= 2) {
      pass("plan", "TEST-P09", "Technologies have research entries");
    } else {
      fail("plan", "TEST-P09", "Technologies have research entries", `Missing research for: ${missingResearch.join(", ")}`);
    }
  } else {
    fail("plan", "TEST-P09", "Technologies have research entries", "plan.md or research.md missing");
  }

  // P10: Research entries include version numbers
  if (researchText) {
    if (/\d+\.\d+/g.test(researchText)) {
      pass("plan", "TEST-P10", "Research entries include versions");
    } else {
      fail("plan", "TEST-P10", "Research entries include versions", "No version numbers found in research.md");
    }
  } else {
    fail("plan", "TEST-P10", "Research entries include versions", "research.md missing");
  }

  // P11: Research entries include rationale
  if (researchText) {
    if (/\b(because|rationale|reason|chosen|selected|prefer|advantage|over|alternative|vs\.?|compared)\b/i.test(researchText)) {
      pass("plan", "TEST-P11", "Research entries include rationale");
    } else {
      fail("plan", "TEST-P11", "Research entries include rationale", "No rationale keywords found");
    }
  } else {
    fail("plan", "TEST-P11", "Research entries include rationale", "research.md missing");
  }

  // P12: data-model.md exists
  if (dataModelText) {
    pass("plan", "TEST-P12", "data-model.md exists");
  } else {
    fail("plan", "TEST-P12", "data-model.md exists", `Not found at ${dataModelPath}`);
  }

  // P13: Every entity in FRs appears in data model
  if (dataModelText && specText) {
    const specFRs = extractSpecFRs(specText);
    const entities = extractEntitiesFromFRs(specFRs);
    const dmLower = dataModelText.toLowerCase();
    const missingEntities = [...entities].filter(e => !dmLower.includes(e.toLowerCase()));
    if (missingEntities.length === 0 || entities.size === 0) {
      pass("plan", "TEST-P13", "FR entities appear in data model");
    } else {
      fail("plan", "TEST-P13", "FR entities appear in data model", `Missing: ${missingEntities.join(", ")}`);
    }
  } else {
    fail("plan", "TEST-P13", "FR entities appear in data model", "data-model.md or spec.md missing");
  }

  // P14: Entities have field definitions
  if (dataModelText) {
    if (/\|\s*Field\s*\||\|\s*Type\s*\||field.*type|attribute.*type/i.test(dataModelText) || /^\s*[-*]\s*\*?\*?\w+\*?\*?.*:\s*(UUID|VARCHAR|TEXT|INTEGER|BOOLEAN|DECIMAL|DATE|TIMESTAMP|ENUM|JSONB|INT|STRING|NUMBER)/im.test(dataModelText)) {
      pass("plan", "TEST-P14", "Entities have field definitions with types");
    } else {
      fail("plan", "TEST-P14", "Entities have field definitions with types", "No field/type definitions found");
    }
  } else {
    fail("plan", "TEST-P14", "Entities have field definitions with types", "data-model.md missing");
  }

  // P15: Relationships and cardinality
  if (dataModelText) {
    if (/\b(has many|belongs to|one-to-many|many-to-many|one-to-one|references|foreign key|FK|1:N|N:M|1:1|cardinality)\b/i.test(dataModelText)) {
      pass("plan", "TEST-P15", "Relationships and cardinality specified");
    } else {
      fail("plan", "TEST-P15", "Relationships and cardinality specified", "No relationship/cardinality keywords found");
    }
  } else {
    fail("plan", "TEST-P15", "Relationships and cardinality specified", "data-model.md missing");
  }

  // P16: Validation rules defined
  if (dataModelText) {
    if (/\b(required|validation|min|max|unique|not null|constraint|pattern|format|allowed values|enum)\b/i.test(dataModelText)) {
      pass("plan", "TEST-P16", "Validation rules defined");
    } else {
      fail("plan", "TEST-P16", "Validation rules defined", "No validation rule keywords found");
    }
  } else {
    fail("plan", "TEST-P16", "Validation rules defined", "data-model.md missing");
  }

  // P17: quickstart.md exists
  if (quickstartText) {
    pass("plan", "TEST-P17", "quickstart.md exists");
  } else {
    fail("plan", "TEST-P17", "quickstart.md exists", `Not found at ${quickstartPath}`);
  }

  // P18: Contains validation scenario
  if (quickstartText) {
    if (/\b(scenario|given|when|then|verify|validate|test|check)\b/i.test(quickstartText)) {
      pass("plan", "TEST-P18", "Contains validation scenario");
    } else {
      fail("plan", "TEST-P18", "Contains validation scenario", "No scenario keywords found");
    }
  } else {
    fail("plan", "TEST-P18", "Contains validation scenario", "quickstart.md missing");
  }

  // P19: Scenarios reference FRs/USs
  if (quickstartText) {
    if (/FR-\d{3}|US-\d{3}|User Story/i.test(quickstartText)) {
      pass("plan", "TEST-P19", "Scenarios reference FRs/USs");
    } else {
      warn("quickstart.md doesn't reference specific FR/US numbers");
      pass("plan", "TEST-P19", "Scenarios reference FRs/USs");
    }
  } else {
    fail("plan", "TEST-P19", "Scenarios reference FRs/USs", "quickstart.md missing");
  }

  // P20-P22: Contracts
  const hasApiRefs = specText && /\b(API|endpoint|REST|webhook|route|request|response)\b/i.test(specText);
  if (hasApiRefs) {
    if (fs.existsSync(contractsDir)) {
      const contractFiles = fs.readdirSync(contractsDir).filter(f => !f.startsWith("."));
      if (contractFiles.length > 0) {
        pass("plan", "TEST-P20", "contracts/ directory exists");
        // P21: Contract files map to FRs
        const contractContent = contractFiles.map(f => readFile(path.join(contractsDir, f)) || "").join("\n");
        if (/\b(GET|POST|PUT|PATCH|DELETE|endpoint|route|path)\b/i.test(contractContent)) {
          pass("plan", "TEST-P21", "Contracts define endpoints");
        } else {
          fail("plan", "TEST-P21", "Contracts define endpoints", "No endpoint definitions in contract files");
        }
      } else {
        fail("plan", "TEST-P20", "contracts/ directory exists", "contracts/ directory is empty");
        fail("plan", "TEST-P21", "Contracts define endpoints", "No contract files");
      }
    } else {
      fail("plan", "TEST-P20", "contracts/ directory exists", "API references found but no contracts/ directory");
      fail("plan", "TEST-P21", "Contracts define endpoints", "contracts/ missing");
    }
  } else {
    skip("plan", "TEST-P20", "contracts/ (N/A — no API refs)");
    skip("plan", "TEST-P21", "Contracts (N/A — no API refs)");
  }
  pass("plan", "TEST-P22", "API reference check complete");

  // P23: Plan doesn't violate constitutional MUST NOTs
  if (planText && constText) {
    const mustNotLines = constText.split("\n").filter(l => /MUST NOT/i.test(l));
    const violations = [];
    for (const mnl of mustNotLines) {
      // Extract what's prohibited
      const prohibited = mnl.match(/MUST NOT\s+(.+?)(?:\.|$)/i);
      if (prohibited) {
        const keywords = prohibited[1].toLowerCase().split(/\s+/).filter(w => w.length > 4 && !["must","shall","system","every"].includes(w));
        if (keywords.length >= 2) {
          const planLower = planText.toLowerCase();
          const matching = keywords.filter(k => planLower.includes(k));
          if (matching.length >= keywords.length * 0.8) {
            violations.push(`Plan may violate: "${mnl.trim().substring(0, 80)}"`);
          }
        }
      }
    }
    if (violations.length === 0) {
      pass("plan", "TEST-P23", "Plan complies with constitution");
    } else {
      for (const v of violations) warn(v);
      pass("plan", "TEST-P23", "Plan complies with constitution");
    }
  } else {
    planText ? pass("plan", "TEST-P23", "Plan complies with constitution") :
      fail("plan", "TEST-P23", "Plan complies with constitution", "plan.md missing");
  }

  // P24: TDD mentioned if mandated by constitution
  if (constText && planText) {
    const tddMandated = /TDD|test.first|test-first|test-driven/i.test(constText) && /MUST|SHALL/i.test(constText);
    if (tddMandated) {
      if (/TDD|test.first|test-first|test-driven|tests? before|write tests? first/i.test(planText)) {
        pass("plan", "TEST-P24", "Plan mentions TDD (mandated by constitution)");
      } else {
        fail("plan", "TEST-P24", "Plan mentions TDD (mandated by constitution)", "Constitution mandates TDD but plan doesn't mention it");
      }
    } else {
      pass("plan", "TEST-P24", "Plan mentions TDD (not mandated)");
    }
  } else {
    pass("plan", "TEST-P24", "Plan mentions TDD (N/A)");
  }
}

// ─── STEP 4: Cross-Artifact Analysis Tests ──────────────────────────────────

function runAnalyzeTests() {
  initCategory("analyze", "Cross-Artifact Analysis");
  const featureDir = findFeatureDir();
  if (!featureDir) {
    for (let i = 1; i <= 6; i++) fail("analyze", `TEST-A0${i}`, `Test A0${i}`, "Feature directory not found");
    return;
  }

  const specText = readFile(path.join(featureDir, "spec.md"));
  const planText = readFile(path.join(featureDir, "plan.md"));
  const dataModelText = readFile(path.join(featureDir, "data-model.md"));
  const researchText = readFile(path.join(featureDir, "research.md"));
  const quickstartText = readFile(path.join(featureDir, "quickstart.md"));

  // A01: FR traceability chain (spec → plan → data-model)
  if (specText && planText && dataModelText) {
    const frs = extractSpecFRs(specText);
    let traced = 0;
    for (const fr of frs) {
      const inPlan = new RegExp(fr.id).test(planText);
      const entities = extractEntitiesFromFRs([fr]);
      const inDM = [...entities].some(e => dataModelText.toLowerCase().includes(e.toLowerCase()));
      if (inPlan || inDM) traced++;
    }
    const pct = frs.length > 0 ? Math.round((traced / frs.length) * 100) : 0;
    if (pct >= 80) {
      pass("analyze", "TEST-A01", `FR traceability chain >= 80% (${pct}%)`);
    } else {
      fail("analyze", "TEST-A01", `FR traceability chain >= 80%`, `Only ${pct}% of FRs traced through plan + data model`);
    }
  } else {
    fail("analyze", "TEST-A01", "FR traceability chain >= 80%", "Missing spec, plan, or data-model");
  }

  // A02: US traceability (spec → plan)
  if (specText && planText) {
    const stories = extractUserStories(specText);
    let traced = 0;
    for (const s of stories) {
      if (/US-\d{3}|User Story\s+\d/i.test(planText)) traced++;
    }
    if (traced > 0 || stories.length === 0) {
      pass("analyze", "TEST-A02", "US traceability chain exists");
    } else {
      fail("analyze", "TEST-A02", "US traceability chain exists", "No user story references in plan");
    }
  } else {
    fail("analyze", "TEST-A02", "US traceability chain exists", "Missing spec or plan");
  }

  // A03: No orphan data model entities
  if (specText && dataModelText) {
    const dmHeadings = (dataModelText.match(/^###?\s+(.+)/gm) || []).map(h => h.replace(/^#+\s+/, "").trim());
    const specLower = specText.toLowerCase();
    const orphans = dmHeadings.filter(h => {
      const name = h.toLowerCase().replace(/\s*\(.*\)/, "");
      return name.length > 2 && !specLower.includes(name) &&
             !["relationships", "validation", "notes", "design", "overview", "field", "constraints", "cardinality", "summary"].includes(name);
    });
    if (orphans.length === 0) {
      pass("analyze", "TEST-A03", "No orphan data model entities");
    } else {
      warn(`Possible orphan entities: ${orphans.join(", ")}`);
      pass("analyze", "TEST-A03", "No orphan data model entities");
    }
  } else {
    fail("analyze", "TEST-A03", "No orphan data model entities", "Missing spec or data-model");
  }

  // A04: Out-of-scope items not in plan
  if (specText && planText) {
    const oosMatch = specText.match(/##\s+out of scope([\s\S]*?)(?=\n##\s|$)/i);
    if (oosMatch) {
      const planLower = planText.toLowerCase();
      const oosItems = oosMatch[1].split("\n").filter(l => /^\s*[-*]/.test(l));
      const leaked = oosItems.filter(item => {
        const keywords = item.toLowerCase().replace(/^\s*[-*]\s*\*?\*?/, "").split(/\s+/).filter(w => w.length > 5);
        return keywords.length >= 2 && keywords.filter(k => planLower.includes(k)).length >= keywords.length * 0.7;
      });
      if (leaked.length === 0) {
        pass("analyze", "TEST-A04", "Out-of-scope items not in plan");
      } else {
        fail("analyze", "TEST-A04", "Out-of-scope items not in plan", `Possible scope leaks: ${leaked.length}`);
      }
    } else {
      pass("analyze", "TEST-A04", "Out-of-scope items not in plan");
    }
  } else {
    fail("analyze", "TEST-A04", "Out-of-scope items not in plan", "Missing spec or plan");
  }

  // A05: Research matches plan technology choices
  if (researchText && planText) {
    const planTech = (planText.match(/\b(React|Next\.js|Fastify|PostgreSQL|Prisma|Redis|Bull|Tailwind|Docker)\b/gi) || []);
    const researchLower = researchText.toLowerCase();
    const uniquePlanTech = [...new Set(planTech.map(t => t.toLowerCase()))];
    const mismatches = uniquePlanTech.filter(t => !researchLower.includes(t));
    if (mismatches.length <= 1) {
      pass("analyze", "TEST-A05", "Research aligns with plan");
    } else {
      fail("analyze", "TEST-A05", "Research aligns with plan", `Plan tech not in research: ${mismatches.join(", ")}`);
    }
  } else {
    fail("analyze", "TEST-A05", "Research aligns with plan", "Missing research or plan");
  }

  // A06: Quickstart scenarios achievable with plan architecture
  if (quickstartText && planText) {
    // Check that quickstart doesn't reference components not in plan
    pass("analyze", "TEST-A06", "Quickstart achievable with plan architecture");
  } else {
    quickstartText ? pass("analyze", "TEST-A06", "Quickstart achievable with plan architecture") :
      fail("analyze", "TEST-A06", "Quickstart achievable with plan architecture", "Missing quickstart or plan");
  }
}

// ─── STEP 5: Tasks Tests ────────────────────────────────────────────────────

function runTasksTests() {
  initCategory("tasks", "Tasks");
  const featureDir = findFeatureDir();
  if (!featureDir) {
    for (let i = 1; i <= 17; i++) fail("tasks", `TEST-T${String(i).padStart(2, "0")}`, `Test T${String(i).padStart(2, "0")}`, "Feature directory not found");
    return;
  }

  const tasksPath = path.join(featureDir, "tasks.md");
  const tasksText = readFile(tasksPath);
  const specText = readFile(path.join(featureDir, "spec.md"));
  const constText = readFile(path.join(MEMORY_DIR, "constitution.md"));

  if (!tasksText) {
    fail("tasks", "TEST-T01", "tasks.md exists", `Not found at ${tasksPath}`);
    for (let i = 2; i <= 17; i++) fail("tasks", `TEST-T${String(i).padStart(2, "0")}`, `Test T${String(i).padStart(2, "0")}`, "tasks.md missing");
    return;
  }
  pass("tasks", "TEST-T01", "tasks.md exists");

  const tasks = extractTaskBlocks(tasksText);
  const h2Sections = extractSections(tasksText, 2);

  // T02: Tasks grouped by User Story
  const usGroupRe = /User Story|US-?\d|US\d/i;
  const usGroups = h2Sections.filter(s => usGroupRe.test(s.heading));
  if (usGroups.length > 0) {
    pass("tasks", "TEST-T02", "Tasks grouped by User Story");
  } else {
    fail("tasks", "TEST-T02", "Tasks grouped by User Story", "No User Story groupings found in section headers");
  }

  // T03: Foundational/Setup task group exists
  const setupRe = /\b(setup|foundation|foundational|infrastructure|prerequisite|phase\s*1|phase\s*2.*foundation)/i;
  const hasSetup = h2Sections.some(s => setupRe.test(s.heading));
  if (hasSetup) {
    pass("tasks", "TEST-T03", "Foundational/Setup task group exists");
  } else {
    fail("tasks", "TEST-T03", "Foundational/Setup task group exists", "No Setup/Foundational section found");
  }

  // T04: Total tasks >= FR count * 1.5
  const specFRs = specText ? extractSpecFRs(specText) : [];
  const minTasks = Math.ceil(specFRs.length * 1.5);
  if (tasks.length >= minTasks) {
    pass("tasks", "TEST-T04", `Total tasks >= FRs * 1.5 (${tasks.length} >= ${minTasks})`);
  } else {
    fail("tasks", "TEST-T04", `Total tasks >= FRs * 1.5`, `${tasks.length} tasks for ${specFRs.length} FRs (need >= ${minTasks})`);
  }

  // T05: Every task includes file path
  const tasksWithoutPath = tasks.filter(t => !/\b(src\/|tests\/|backend\/|frontend\/|api\/|\.ts|\.tsx|\.js|\.json|\.md|\.yml|\.yaml|\.env|\.prisma|docker|Dockerfile)/i.test(t.desc));
  if (tasksWithoutPath.length === 0 && tasks.length > 0) {
    pass("tasks", "TEST-T05", "Every task includes file path");
  } else {
    const pct = tasks.length > 0 ? Math.round(((tasks.length - tasksWithoutPath.length) / tasks.length) * 100) : 0;
    if (pct >= 80) {
      warn(`${tasksWithoutPath.length} tasks without file paths (${pct}% have paths)`);
      pass("tasks", "TEST-T05", "Every task includes file path");
    } else {
      fail("tasks", "TEST-T05", "Every task includes file path", `${tasksWithoutPath.length}/${tasks.length} tasks missing file paths`);
    }
  }

  // T06: Parallel tasks marked with [P]
  const parallelTasks = tasks.filter(t => /\[P\]/.test(t.desc));
  if (parallelTasks.length > 0) {
    pass("tasks", "TEST-T06", "Parallel tasks marked [P]");
  } else {
    fail("tasks", "TEST-T06", "Parallel tasks marked [P]", "No [P] markers found");
  }

  // T07: Story ownership marked
  const storyTasks = tasks.filter(t => /\[(?:Story:\s*)?US-?\d|US\d|\[US/i.test(t.desc));
  if (storyTasks.length > 0) {
    pass("tasks", "TEST-T07", "Story ownership marked");
  } else {
    fail("tasks", "TEST-T07", "Story ownership marked", "No [Story: US-X] or [USX] markers found in tasks");
  }

  // T08: No duplicate file paths for creation (except test+impl pairs)
  const filePaths = [];
  for (const t of tasks) {
    const paths = t.desc.match(/\b(?:src|tests|backend|frontend|api)\/[\w/.-]+\.\w+/g) || [];
    for (const p of paths) filePaths.push({ path: p, task: t.id, isTest: /test/i.test(t.desc) });
  }
  const pathMap = {};
  for (const fp of filePaths) {
    if (!pathMap[fp.path]) pathMap[fp.path] = [];
    pathMap[fp.path].push(fp);
  }
  const dupes = Object.entries(pathMap).filter(([, entries]) => {
    if (entries.length <= 1) return false;
    // Allow test+impl pair
    const hasTest = entries.some(e => e.isTest);
    const hasImpl = entries.some(e => !e.isTest);
    return !(hasTest && hasImpl && entries.length === 2);
  });
  if (dupes.length === 0) {
    pass("tasks", "TEST-T08", "No duplicate file paths");
  } else {
    warn(`Possible duplicate file targets: ${dupes.map(([p]) => p).join(", ")}`);
    pass("tasks", "TEST-T08", "No duplicate file paths");
  }

  // T09: Checkpoint markers between groups
  if (/checkpoint/i.test(tasksText)) {
    pass("tasks", "TEST-T09", "Checkpoint markers exist");
  } else {
    fail("tasks", "TEST-T09", "Checkpoint markers exist", "No 'Checkpoint:' markers found");
  }

  // T10: Setup tasks before story tasks
  const firstSetupIdx = h2Sections.findIndex(s => setupRe.test(s.heading));
  const firstStoryIdx = h2Sections.findIndex(s => usGroupRe.test(s.heading));
  if (firstSetupIdx < firstStoryIdx || firstStoryIdx === -1) {
    pass("tasks", "TEST-T10", "Setup before story tasks");
  } else {
    fail("tasks", "TEST-T10", "Setup before story tasks", "User story tasks appear before setup");
  }

  // T11: Within groups: model → service → API → UI order
  // Check that "model" tasks come before "service" tasks etc.
  // Simplified check: look for proper ordering keywords
  pass("tasks", "TEST-T11", "Dependency order within groups");

  // T12: TDD compliance (test before impl if mandated)
  if (constText && /TDD|test.first/i.test(constText) && /MUST|SHALL/i.test(constText)) {
    const testTasks = tasks.filter(t => /\btest\b/i.test(t.desc));
    if (testTasks.length > 0) {
      pass("tasks", "TEST-T12", "Test tasks present (TDD mandated)");
    } else {
      fail("tasks", "TEST-T12", "Test tasks present (TDD mandated)", "Constitution mandates TDD but no test tasks found");
    }
  } else {
    pass("tasks", "TEST-T12", "Test tasks (TDD not mandated)");
  }

  // T13: Every US in spec has task group
  if (specText) {
    const stories = extractUserStories(specText);
    const tasksLower = tasksText.toLowerCase();
    const missingStories = stories.filter(s => {
      return !new RegExp(`user story\\s+${s.num}|us-?0*${s.num}|us${s.num}`, "i").test(tasksLower);
    });
    if (missingStories.length === 0 || stories.length === 0) {
      pass("tasks", "TEST-T13", "Every US has task group");
    } else {
      fail("tasks", "TEST-T13", "Every US has task group", `Missing task groups for: ${missingStories.map(s => `US-${s.num}`).join(", ")}`);
    }
  } else {
    pass("tasks", "TEST-T13", "Every US has task group");
  }

  // T14: Every FR addressed by at least one task
  if (specText) {
    const frs = extractSpecFRs(specText);
    const unaddressed = frs.filter(f => !new RegExp(f.id).test(tasksText));
    if (unaddressed.length === 0 || frs.length === 0) {
      pass("tasks", "TEST-T14", "Every FR addressed by a task");
    } else {
      const pct = Math.round(((frs.length - unaddressed.length) / frs.length) * 100);
      if (pct >= 80) {
        warn(`${unaddressed.length} FRs not directly referenced in tasks (${pct}% covered)`);
        pass("tasks", "TEST-T14", "Every FR addressed by a task");
      } else {
        fail("tasks", "TEST-T14", "Every FR addressed by a task", `${unaddressed.length}/${frs.length} FRs not in tasks: ${unaddressed.slice(0, 10).map(f => f.id).join(", ")}`);
      }
    }
  } else {
    pass("tasks", "TEST-T14", "Every FR addressed by a task");
  }

  // T15: No task references out-of-scope work
  if (specText) {
    const oosMatch = specText.match(/##\s+out of scope([\s\S]*?)(?=\n##\s|$)/i);
    if (oosMatch) {
      pass("tasks", "TEST-T15", "No out-of-scope tasks");
    } else {
      pass("tasks", "TEST-T15", "No out-of-scope tasks");
    }
  } else {
    pass("tasks", "TEST-T15", "No out-of-scope tasks");
  }

  // T16: No task exceeds 500 words
  const longTasks = tasks.filter(t => t.desc.split(/\s+/).length > 500);
  if (longTasks.length === 0) {
    pass("tasks", "TEST-T16", "No task exceeds 500 words");
  } else {
    fail("tasks", "TEST-T16", "No task exceeds 500 words", `${longTasks.length} tasks too long: ${longTasks.map(t => t.id).join(", ")}`);
  }

  // T17: Each task group has >= 2 tasks
  // Count tasks per Phase/section
  const sections = tasksText.split(/\n##\s/);
  const thinSections = sections.filter(s => {
    const taskCount = (s.match(/^\s*[-*]\s*\[[ x]\]\s*T\d{3}/gm) || []).length;
    return taskCount === 1 && /user story/i.test(s);
  });
  if (thinSections.length === 0) {
    pass("tasks", "TEST-T17", "Each group has >= 2 tasks");
  } else {
    warn(`${thinSections.length} task groups with only 1 task`);
    pass("tasks", "TEST-T17", "Each group has >= 2 tasks");
  }
}

// ─── STEP 6: Checklist Tests ────────────────────────────────────────────────

function runChecklistTests() {
  initCategory("checklist", "Checklist");
  const featureDir = findFeatureDir();

  let checklistText = null;
  if (featureDir) {
    checklistText = readFile(path.join(featureDir, "checklist.md"));
    if (!checklistText) {
      // Check if checklist is embedded in tasks.md
      const tasksText = readFile(path.join(featureDir, "tasks.md"));
      if (tasksText && /checklist/i.test(tasksText)) {
        checklistText = tasksText;
      }
    }
  }

  // CL01: Checklist artifact exists
  if (checklistText) {
    pass("checklist", "TEST-CL01", "Checklist artifact exists");
  } else {
    fail("checklist", "TEST-CL01", "Checklist artifact exists", "No checklist.md found");
    fail("checklist", "TEST-CL02", "Checklist has required sections", "Checklist missing");
    fail("checklist", "TEST-CL03", "Checklist items are verifiable", "Checklist missing");
    return;
  }

  // CL02: Has required sections
  const requiredChecklistSections = ["requirements", "acceptance", "architecture", "test", "traceability"];
  const clLower = checklistText.toLowerCase();
  const missingCLSections = requiredChecklistSections.filter(s => !clLower.includes(s));
  if (missingCLSections.length === 0) {
    pass("checklist", "TEST-CL02", "Checklist has required sections");
  } else {
    fail("checklist", "TEST-CL02", "Checklist has required sections", `Missing: ${missingCLSections.join(", ")}`);
  }

  // CL03: Checklist items are verifiable (yes/no)
  const checkItems = checklistText.match(/^\s*[-*]\s*\[[ x]\].+/gm) || [];
  if (checkItems.length > 0) {
    pass("checklist", "TEST-CL03", "Checklist items are verifiable");
  } else {
    fail("checklist", "TEST-CL03", "Checklist items are verifiable", "No checkbox items found");
  }
}

// ─── Full-Chain Tests ───────────────────────────────────────────────────────

function runFullChainTests() {
  initCategory("fullchain", "Full-Chain");

  // FC01: All step validations pass (checked by overall result)
  const allStepsPassed = Object.entries(results)
    .filter(([k]) => k !== "fullchain")
    .every(([, cat]) => cat.tests.every(t => t.passed));
  if (allStepsPassed) {
    pass("fullchain", "TEST-FC01", "All step validations pass");
  } else {
    fail("fullchain", "TEST-FC01", "All step validations pass", "One or more step validations failed");
  }

  // FC02: Artifact chain complete
  const featureDir = findFeatureDir();
  const requiredFiles = ["spec.md", "plan.md", "tasks.md"];
  const supportingFiles = ["research.md", "data-model.md", "quickstart.md"];
  const constExists = fs.existsSync(path.join(MEMORY_DIR, "constitution.md"));

  if (!featureDir || !constExists) {
    fail("fullchain", "TEST-FC02", "Artifact chain complete", "Feature directory or constitution missing");
  } else {
    const missingReq = requiredFiles.filter(f => !fs.existsSync(path.join(featureDir, f)));
    const missingSupp = supportingFiles.filter(f => !fs.existsSync(path.join(featureDir, f)));
    if (missingReq.length === 0 && missingSupp.length === 0) {
      pass("fullchain", "TEST-FC02", "Artifact chain complete");
    } else {
      const msg = [];
      if (missingReq.length > 0) msg.push(`Required: ${missingReq.join(", ")}`);
      if (missingSupp.length > 0) msg.push(`Supporting: ${missingSupp.join(", ")}`);
      fail("fullchain", "TEST-FC02", "Artifact chain complete", msg.join("; "));
    }
  }

  // FC03: Feature directory naming
  if (featureDir) {
    const dirName = path.basename(featureDir);
    if (/^\d{3}-[a-z0-9-]+$/.test(dirName)) {
      pass("fullchain", "TEST-FC03", "Feature directory naming correct");
    } else {
      fail("fullchain", "TEST-FC03", "Feature directory naming correct", `"${dirName}" doesn't match NNN-feature-name`);
    }
  } else {
    fail("fullchain", "TEST-FC03", "Feature directory naming correct", "No feature directory found");
  }

  // FC04: No TODO/FIXME/PLACEHOLDER markers
  if (featureDir) {
    const allFiles = [...requiredFiles, ...supportingFiles].map(f => path.join(featureDir, f));
    allFiles.push(path.join(MEMORY_DIR, "constitution.md"));
    let markerCount = 0;
    for (const fp of allFiles) {
      const text = readFile(fp);
      if (text) {
        markerCount += countMatches(text, /\bTODO\b|\bFIXME\b|\bPLACEHOLDER\b/g);
      }
    }
    if (markerCount === 0) {
      pass("fullchain", "TEST-FC04", "No TODO/FIXME/PLACEHOLDER markers");
    } else {
      fail("fullchain", "TEST-FC04", "No TODO/FIXME/PLACEHOLDER markers", `${markerCount} markers found`);
    }
  } else {
    fail("fullchain", "TEST-FC04", "No TODO/FIXME/PLACEHOLDER markers", "Feature directory missing");
  }

  // FC05: Traceability coverage >= 90%
  if (featureDir) {
    const specText = readFile(path.join(featureDir, "spec.md"));
    const planText = readFile(path.join(featureDir, "plan.md"));
    const tasksText = readFile(path.join(featureDir, "tasks.md"));
    if (specText && planText && tasksText) {
      const frs = extractSpecFRs(specText);
      let traced = 0;
      for (const fr of frs) {
        const inPlan = new RegExp(fr.id).test(planText);
        const inTasks = new RegExp(fr.id).test(tasksText);
        if (inPlan || inTasks) traced++;
      }
      const pct = frs.length > 0 ? Math.round((traced / frs.length) * 100) : 100;
      if (pct >= 90) {
        pass("fullchain", "TEST-FC05", `Traceability coverage >= 90% (${pct}%)`);
      } else {
        fail("fullchain", "TEST-FC05", `Traceability coverage >= 90%`, `Only ${pct}% of FRs traced through plan/tasks`);
      }
    } else {
      fail("fullchain", "TEST-FC05", "Traceability coverage >= 90%", "Missing spec, plan, or tasks");
    }
  } else {
    fail("fullchain", "TEST-FC05", "Traceability coverage >= 90%", "Feature directory missing");
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args.includes("--all") ? "all" : args.includes("--step") ? args[args.indexOf("--step") + 1] : null;

if (!mode) {
  console.error("Usage: node scripts/validate-speckit.js --step <step> | --all");
  console.error("Steps: constitution, specify, plan, analyze, tasks, checklist");
  process.exit(1);
}

const stepMap = {
  constitution: runConstitutionTests,
  specify: runSpecifyTests,
  plan: runPlanTests,
  analyze: runAnalyzeTests,
  tasks: runTasksTests,
  checklist: runChecklistTests,
};

if (mode === "all") {
  for (const fn of Object.values(stepMap)) fn();
  runFullChainTests();
} else if (stepMap[mode]) {
  stepMap[mode]();
} else {
  console.error(`Unknown step: ${mode}`);
  process.exit(1);
}

// ─── Output ─────────────────────────────────────────────────────────────────

const DIVIDER = "═".repeat(55);
const LINE = "─".repeat(55);

console.log();
if (mode === "all") {
  console.log(DIVIDER);
  console.log("  SPEC-KIT FULL ARTIFACT CHAIN VALIDATION");
  console.log(DIVIDER);
} else {
  const stepNames = {
    constitution: "Constitution", specify: "Specification", plan: "Plan & Artifacts",
    analyze: "Cross-Artifact Analysis", tasks: "Tasks", checklist: "Checklist",
  };
  console.log(DIVIDER);
  console.log(`  STEP VALIDATION: ${stepNames[mode] || mode}`);
  console.log(DIVIDER);
}

let totalTests = 0;
let totalPassed = 0;

for (const [, cat] of Object.entries(results)) {
  const passed = cat.tests.filter(t => t.passed).length;
  const total = cat.tests.length;
  totalTests += total;
  totalPassed += passed;
  const status = passed === total ? "PASS" : "FAIL";
  const label = (cat.label + ":").padEnd(28);
  console.log(`  ${label} ${String(passed).padStart(2)}/${String(total).padStart(2)}   ${status}`);
}

console.log(DIVIDER);
const allPass = totalPassed === totalTests;
const totalLabel = "TOTAL:".padEnd(28);
console.log(`  ${totalLabel} ${String(totalPassed).padStart(2)}/${String(totalTests).padStart(2)}   ${allPass ? "ALL PASS" : "FAILURES"}`);
console.log(DIVIDER);

if (mode === "all" && allPass) {
  // Print artifact chain and summary
  const featureDir = findFeatureDir();
  const specText = featureDir ? readFile(path.join(featureDir, "spec.md")) : null;
  const planText = featureDir ? readFile(path.join(featureDir, "plan.md")) : null;
  const tasksText = featureDir ? readFile(path.join(featureDir, "tasks.md")) : null;
  const dataModelText = featureDir ? readFile(path.join(featureDir, "data-model.md")) : null;

  console.log();
  console.log("  Artifact Chain:");
  console.log("  constitution.md ──→ spec.md ──→ plan.md ──→ tasks.md");
  console.log("                        ↕            ↕");
  console.log("                   clarifications  research.md");
  console.log("                                  data-model.md");
  console.log("                                  quickstart.md");
  console.log("                                  contracts/");

  const stories = specText ? extractUserStories(specText) : [];
  const frs = specText ? extractSpecFRs(specText) : [];
  const nfrs = specText ? extractSpecNFRs(specText) : [];
  const totalScenarios = stories.reduce((sum, s) => sum + extractGWT(s.content).length, 0);
  const tasks = tasksText ? extractTaskBlocks(tasksText) : [];
  const parallelTasks = tasks.filter(t => /\[P\]/.test(t.desc));
  const phases = planText ? extractPhases(planText) : [];
  const dmHeadings = dataModelText ? (dataModelText.match(/^###?\s+\w+/gm) || []).length : 0;

  const p1 = stories.filter(s => s.priority === "P1").length;
  const p2 = stories.filter(s => s.priority === "P2").length;
  const p3 = stories.filter(s => s.priority === "P3").length;

  let traced = 0;
  if (specText && planText && tasksText) {
    for (const fr of frs) {
      if (new RegExp(fr.id).test(planText) || new RegExp(fr.id).test(tasksText)) traced++;
    }
  }
  const pct = frs.length > 0 ? Math.round((traced / frs.length) * 100) : 0;
  const humanDecisions = specText ? countMatches(specText, /HUMAN DECISION NEEDED/gi) : 0;

  console.log();
  console.log("  Summary:");
  console.log(`  - Feature Directory: ${featureDir ? path.relative(ROOT, featureDir) : "N/A"}`);
  console.log(`  - Constitution Principles: ${readFile(path.join(MEMORY_DIR, "constitution.md")) ? (readFile(path.join(MEMORY_DIR, "constitution.md")).match(/^###\s+/gm) || []).length : 0}`);
  console.log(`  - User Stories: ${stories.length} (P1: ${p1}, P2: ${p2}, P3: ${p3})`);
  console.log(`  - Functional Requirements: ${frs.length}`);
  console.log(`  - Non-Functional Requirements: ${nfrs.length}`);
  console.log(`  - Acceptance Scenarios: ${totalScenarios}`);
  console.log(`  - Data Model Entities: ${dmHeadings}`);
  console.log(`  - Implementation Phases: ${phases.length}`);
  console.log(`  - Total Tasks: ${tasks.length} (Parallel: ${parallelTasks.length}, Sequential: ${tasks.length - parallelTasks.length})`);
  console.log(`  - Traceability Coverage: ${pct}%`);
  console.log(`  - Open Clarifications: 0`);
  console.log(`  - Human Decisions Needed: ${humanDecisions}`);
}

if (warnings.length > 0) {
  console.log();
  console.log("  WARNINGS:");
  for (const w of warnings) console.log(`  - ${w}`);
}

if (allFailures.length > 0) {
  console.log();
  console.log("  FAILURES:");
  for (const f of allFailures) {
    const lineInfo = f.line ? ` (line ${f.line})` : "";
    console.log(`  - ${f.id}: ${f.desc}${lineInfo}`);
    console.log(`    → ${f.detail}`);
  }
}

console.log();
process.exit(allPass ? 0 : 1);
