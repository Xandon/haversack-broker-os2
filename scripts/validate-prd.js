#!/usr/bin/env node

/**
 * PRD Validation Script
 * Validates docs/prd.md against quality criteria for a production-grade PRD.
 * Exit code 0 = all pass, exit code 1 = failures exist.
 */

const fs = require("fs");
const path = require("path");

const PRD_PATH = path.resolve(__dirname, "..", "docs", "prd.md");

// ─── Helpers ────────────────────────────────────────────────────────────────

function readPRD() {
  if (!fs.existsSync(PRD_PATH)) return null;
  return fs.readFileSync(PRD_PATH, "utf-8");
}

/** Split markdown into sections by ## headings. Returns Map<heading, content> */
function parseSections(md) {
  const sections = new Map();
  const lines = md.split("\n");
  let currentHeading = null;
  let buffer = [];

  for (const line of lines) {
    const m = line.match(/^##\s+\d+\.\s+(.+)/);
    if (m) {
      if (currentHeading !== null) {
        sections.set(currentHeading, buffer.join("\n"));
      }
      currentHeading = m[1].trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (currentHeading !== null) {
    sections.set(currentHeading, buffer.join("\n"));
  }
  return sections;
}

/** Extract all FR-XXX entries */
function extractFRs(md) {
  const frs = [];
  const re = /^[-*]\s*(FR-(\d{3})):\s*(.+)/gm;
  let m;
  while ((m = re.exec(md)) !== null) {
    frs.push({ id: m[1], num: parseInt(m[2], 10), text: m[3], index: m.index });
  }
  return frs;
}

/** Extract all NFR-XXX entries */
function extractNFRs(md) {
  const nfrs = [];
  const re = /^[-*]\s*(NFR-(\d{3})):\s*(.+)/gm;
  let m;
  while ((m = re.exec(md)) !== null) {
    nfrs.push({ id: m[1], num: parseInt(m[2], 10), text: m[3], index: m.index });
  }
  return nfrs;
}

/** Extract all AC-XXXx entries with their full text (may span continuation lines) */
function extractACs(md) {
  const acs = [];
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*[-*]\s*(AC-(\d{3}[a-z])):\s*(.+)/);
    if (m) {
      let text = m[3];
      // Gather continuation lines (indented, no new bullet)
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s{4,}[^\-\*\s]/.test(lines[j]) || /^\s{4,}\S/.test(lines[j])) {
          text += " " + lines[j].trim();
        } else {
          break;
        }
      }
      acs.push({ id: m[1], frNum: m[2].replace(/[a-z]+$/, ""), text, line: i + 1 });
    }
  }
  return acs;
}

/** Extract all US-XXX entries */
function extractUSs(md) {
  const uss = [];
  const re = /^[-*]\s*(US-(\d{3})):\s*(.+)/gm;
  let m;
  while ((m = re.exec(md)) !== null) {
    uss.push({ id: m[1], num: parseInt(m[2], 10), text: m[3], index: m.index });
  }
  return uss;
}

/** Get all FR-XXX references within a block of text */
function findFRRefs(text) {
  const refs = new Set();
  const re = /FR-(\d{3})/g;
  let m;
  while ((m = re.exec(text)) !== null) refs.add(`FR-${m[1]}`);
  return refs;
}

/** Get all US-XXX references within a block of text */
function findUSRefs(text) {
  const refs = new Set();
  const re = /US-(\d{3})/g;
  let m;
  while ((m = re.exec(text)) !== null) refs.add(`US-${m[1]}`);
  return refs;
}

/** Get line number for a character index */
function lineOf(md, index) {
  return md.substring(0, index).split("\n").length;
}

/** Extract user story blocks (from US-XXX to the next US-XXX or ## heading) */
function extractUSBlocks(md) {
  const blocks = [];
  const lines = md.split("\n");
  let current = null;
  let buffer = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^[-*]\s*(US-\d{3}):/);
    if (m) {
      if (current) blocks.push({ id: current, content: buffer.join("\n"), startLine: blocks.length > 0 ? blocks[blocks.length - 1].startLine : i + 1 });
      current = m[1];
      buffer = [lines[i]];
    } else if (current) {
      if (/^##\s/.test(lines[i])) {
        blocks.push({ id: current, content: buffer.join("\n"), startLine: i + 1 - buffer.length });
        current = null;
        buffer = [];
      } else {
        buffer.push(lines[i]);
      }
    }
  }
  if (current) blocks.push({ id: current, content: buffer.join("\n"), startLine: lines.length - buffer.length });
  return blocks;
}

// ─── Test Categories ────────────────────────────────────────────────────────

const results = {
  structural: { tests: [], label: "Structural Tests" },
  completeness: { tests: [], label: "Requirements Completeness" },
  language: { tests: [], label: "Language Quality" },
  traceability: { tests: [], label: "Traceability" },
  edgeCases: { tests: [], label: "Edge Case Coverage" },
  conflicts: { tests: [], label: "Conflict Detection" },
  metrics: { tests: [], label: "Metrics & Measurability" },
};

const warnings = [];
const failures = [];
let summary = {};

function pass(category, name) {
  results[category].tests.push({ name, passed: true });
}

function fail(category, name, detail, line) {
  results[category].tests.push({ name, passed: false });
  failures.push({ name, detail, line });
}

function warn(msg) {
  warnings.push(msg);
}

// ─── Run Validation ─────────────────────────────────────────────────────────

const md = readPRD();

if (!md) {
  // All tests fail when no file exists
  const allTests = [
    ["structural", "PRD file exists"],
    ["structural", "All 10 required sections exist"],
    ["structural", "Overview contains Problem Statement"],
    ["structural", "Overview contains Target Users"],
    ["structural", "Overview contains Success Metrics"],
    ["structural", "Out of Scope section is non-empty"],
    ["structural", "Open Questions section exists"],
    ["structural", "Review Findings section exists"],
    ["completeness", "FRs follow FR-XXX pattern with sequential numbering"],
    ["completeness", "Every FR has at least one AC"],
    ["completeness", "Every AC contains Given/When/Then"],
    ["completeness", "NFRs follow NFR-XXX pattern with sequential numbering"],
    ["completeness", "Every NFR contains measurable target"],
    ["language", "No subjective words without measurable qualifier"],
    ["language", "No passive voice without clear actor"],
    ["traceability", "Every FR referenced by at least one US"],
    ["traceability", "Every US references at least one FR"],
    ["traceability", "Entity names appear in Data Model"],
    ["traceability", "No orphan user stories"],
    ["traceability", "No orphan requirements"],
    ["edgeCases", "Every US has Error/Edge Cases subsection"],
    ["edgeCases", "UI/UX includes loading states"],
    ["edgeCases", "At least one NFR addresses security"],
    ["edgeCases", "At least one NFR addresses performance with response time"],
    ["conflicts", "No contradictory FRs detected"],
    ["conflicts", "No tech constraint conflicts with FRs"],
    ["metrics", "Success metrics contain numbers/percentages"],
    ["metrics", "AC/FR ratio >= 1.5"],
    ["metrics", "Total FR count >= 5"],
    ["metrics", "Total US count >= 3"],
  ];
  for (const [cat, name] of allTests) {
    fail(cat, name, "PRD file does not exist at docs/prd.md");
  }
} else {
  // ── STRUCTURAL TESTS ──────────────────────────────────────────────────
  pass("structural", "PRD file exists");

  const sections = parseSections(md);
  const requiredSections = [
    "Overview",
    "Functional Requirements",
    "Non-Functional Requirements",
    "Technical Constraints",
    "User Stories",
    "Data Model",
    "UI/UX Requirements",
    "Out of Scope",
    "Open Questions",
    "Review Findings",
  ];

  const foundSections = [...sections.keys()];
  const missingSections = requiredSections.filter(
    (s) => !foundSections.some((f) => f.toLowerCase().includes(s.toLowerCase()))
  );

  if (missingSections.length === 0) {
    pass("structural", "All 10 required sections exist");
  } else {
    fail("structural", "All 10 required sections exist", `Missing: ${missingSections.join(", ")}`);
  }

  // Overview subsections
  const overviewContent = [...sections.entries()].find(([k]) =>
    k.toLowerCase().includes("overview")
  );
  const overviewText = overviewContent ? overviewContent[1] : "";

  const checkOverviewSub = (label) => {
    const re = new RegExp(`###.*${label}`, "i");
    if (re.test(overviewText)) {
      pass("structural", `Overview contains ${label}`);
    } else {
      fail("structural", `Overview contains ${label}`, `"${label}" subsection not found under Overview`);
    }
  };
  checkOverviewSub("Problem Statement");
  checkOverviewSub("Target Users");
  checkOverviewSub("Success Metrics");

  // Out of Scope non-empty
  const oosEntry = [...sections.entries()].find(([k]) =>
    k.toLowerCase().includes("out of scope")
  );
  if (oosEntry && oosEntry[1].trim().length > 10) {
    pass("structural", "Out of Scope section is non-empty");
  } else {
    fail("structural", "Out of Scope section is non-empty", "Out of Scope section is empty or too short");
  }

  // Open Questions exists
  const oqEntry = [...sections.entries()].find(([k]) =>
    k.toLowerCase().includes("open questions")
  );
  if (oqEntry !== undefined) {
    pass("structural", "Open Questions section exists");
  } else {
    fail("structural", "Open Questions section exists", "Open Questions section not found");
  }

  // Review Findings exists
  const rfEntry = [...sections.entries()].find(([k]) =>
    k.toLowerCase().includes("review findings")
  );
  if (rfEntry !== undefined) {
    pass("structural", "Review Findings section exists");
  } else {
    fail("structural", "Review Findings section exists", "Review Findings section not found");
  }

  // ── REQUIREMENTS COMPLETENESS ─────────────────────────────────────────
  const frs = extractFRs(md);
  const nfrs = extractNFRs(md);
  const acs = extractACs(md);

  // Sequential FR numbering
  if (frs.length === 0) {
    fail("completeness", "FRs follow FR-XXX pattern with sequential numbering", "No FRs found");
  } else {
    let sequential = true;
    for (let i = 0; i < frs.length; i++) {
      if (frs[i].num !== i + 1) {
        sequential = false;
        fail(
          "completeness",
          "FRs follow FR-XXX pattern with sequential numbering",
          `FR-${String(i + 1).padStart(3, "0")} expected but found ${frs[i].id}`,
          lineOf(md, frs[i].index)
        );
        break;
      }
    }
    if (sequential) pass("completeness", "FRs follow FR-XXX pattern with sequential numbering");
  }

  // Every FR has at least one AC
  if (frs.length === 0) {
    fail("completeness", "Every FR has at least one AC", "No FRs found");
  } else {
    const frNums = frs.map((f) => String(f.num).padStart(3, "0"));
    const acFrNums = new Set(acs.map((a) => a.frNum));
    const missing = frNums.filter((n) => !acFrNums.has(n));
    if (missing.length === 0) {
      pass("completeness", "Every FR has at least one AC");
    } else {
      fail(
        "completeness",
        "Every FR has at least one AC",
        `FRs without ACs: ${missing.map((n) => `FR-${n}`).join(", ")}`
      );
    }
  }

  // Every AC has Given/When/Then
  if (acs.length === 0) {
    fail("completeness", "Every AC contains Given/When/Then", "No ACs found");
  } else {
    const badACs = acs.filter((ac) => {
      const t = ac.text.toLowerCase();
      return !t.includes("given") || !t.includes("when") || !t.includes("then");
    });
    if (badACs.length === 0) {
      pass("completeness", "Every AC contains Given/When/Then");
    } else {
      fail(
        "completeness",
        "Every AC contains Given/When/Then",
        `ACs missing Given/When/Then: ${badACs.map((a) => `${a.id} (line ${a.line})`).join(", ")}`
      );
    }
  }

  // Sequential NFR numbering
  if (nfrs.length === 0) {
    fail("completeness", "NFRs follow NFR-XXX pattern with sequential numbering", "No NFRs found");
  } else {
    let sequential = true;
    for (let i = 0; i < nfrs.length; i++) {
      if (nfrs[i].num !== i + 1) {
        sequential = false;
        fail(
          "completeness",
          "NFRs follow NFR-XXX pattern with sequential numbering",
          `NFR-${String(i + 1).padStart(3, "0")} expected but found ${nfrs[i].id}`,
          lineOf(md, nfrs[i].index)
        );
        break;
      }
    }
    if (sequential) pass("completeness", "NFRs follow NFR-XXX pattern with sequential numbering");
  }

  // Every NFR contains measurable target
  if (nfrs.length === 0) {
    fail("completeness", "Every NFR contains measurable target", "No NFRs found");
  } else {
    const measurableRe = /(\d+(\.\d+)?(%|ms|s|px|MB|GB|KB|min|minutes|hours|days|req|rpm|x)|\d+\/\d+|WCAG|OWASP|FSMA|AES|TLS|ISO|SOC|GDPR|CAN-SPAM|CCPA|PCI|p95|p99)/i;
    const badNFRs = nfrs.filter((n) => {
      // Check the NFR text itself plus any content until the next NFR or section
      return !measurableRe.test(n.text);
    });
    if (badNFRs.length === 0) {
      pass("completeness", "Every NFR contains measurable target");
    } else {
      fail(
        "completeness",
        "Every NFR contains measurable target",
        `NFRs without measurable target: ${badNFRs.map((n) => n.id).join(", ")}`
      );
    }
  }

  // ── LANGUAGE QUALITY ──────────────────────────────────────────────────
  const subjectiveWords = [
    "intuitive", "fast", "easy", "simple", "user-friendly", "seamless",
    "robust", "scalable", "flexible", "modern", "clean", "nice", "good", "efficient",
  ];

  // Collect all requirement lines (FR and NFR lines plus their content)
  const requirementLines = [];
  const mdLines = md.split("\n");
  for (let i = 0; i < mdLines.length; i++) {
    if (/^\s*[-*]\s*(FR-\d{3}|NFR-\d{3}|AC-\d{3}[a-z]):/.test(mdLines[i])) {
      requirementLines.push({ text: mdLines[i], line: i + 1 });
    }
  }

  const subjectiveIssues = [];
  for (const rl of requirementLines) {
    const lower = rl.text.toLowerCase();
    for (const word of subjectiveWords) {
      const wordIdx = lower.indexOf(word);
      if (wordIdx === -1) continue;
      // Check if a number/percentage/standard follows within ~20 words
      const after = lower.substring(wordIdx + word.length);
      const nextWords = after.split(/\s+/).slice(0, 20).join(" ");
      if (!/(\d+(\.\d+)?(%|ms|s|px|min|req)|WCAG|OWASP|FSMA|AES|TLS)/i.test(nextWords)) {
        subjectiveIssues.push({ word, line: rl.line });
      }
    }
  }

  if (subjectiveIssues.length === 0) {
    pass("language", "No subjective words without measurable qualifier");
  } else {
    fail(
      "language",
      "No subjective words without measurable qualifier",
      subjectiveIssues.map((s) => `"${s.word}" at line ${s.line}`).join("; ")
    );
  }

  // Passive voice check
  const passivePatterns = [
    /should be done/i,
    /will be handled/i,
    /should be managed/i,
    /will be processed/i,
    /should be implemented/i,
    /will be completed/i,
    /should be performed/i,
    /will be executed/i,
    /must be done/i,
    /is handled/i,
    /are managed/i,
    /is processed/i,
  ];

  const passiveIssues = [];
  for (const rl of requirementLines) {
    for (const pp of passivePatterns) {
      if (pp.test(rl.text)) {
        // Check if there's a clear actor (the system, the user, the rep, admin, etc.)
        const actorRe = /\b(system|platform|application|server|user|rep|admin|manager|ops|logistics|api|service|engine|cron|job|worker|scheduler|database|cache)\b/i;
        if (!actorRe.test(rl.text)) {
          passiveIssues.push({ pattern: pp.source, line: rl.line });
        }
      }
    }
  }

  if (passiveIssues.length === 0) {
    pass("language", "No passive voice without clear actor");
  } else {
    fail(
      "language",
      "No passive voice without clear actor",
      passiveIssues.map((p) => `"${p.pattern}" at line ${p.line}`).join("; ")
    );
  }

  // ── TRACEABILITY ──────────────────────────────────────────────────────
  const uss = extractUSs(md);
  const usBlocks = extractUSBlocks(md);

  // Every FR referenced by at least one US
  const allFRRefsInUS = new Set();
  for (const usb of usBlocks) {
    for (const ref of findFRRefs(usb.content)) allFRRefsInUS.add(ref);
  }
  const unreferencedFRs = frs.filter((f) => !allFRRefsInUS.has(f.id));
  if (unreferencedFRs.length === 0) {
    pass("traceability", "Every FR referenced by at least one US");
  } else {
    fail(
      "traceability",
      "Every FR referenced by at least one US",
      `Orphan FRs (no US references them): ${unreferencedFRs.map((f) => f.id).join(", ")}`
    );
  }

  // Every US references at least one FR
  const usWithoutFR = usBlocks.filter((usb) => findFRRefs(usb.content).size === 0);
  if (usWithoutFR.length === 0) {
    pass("traceability", "Every US references at least one FR");
  } else {
    fail(
      "traceability",
      "Every US references at least one FR",
      `USs without FR reference: ${usWithoutFR.map((u) => u.id).join(", ")}`
    );
  }

  // Entity names in Data Model
  const dmEntry = [...sections.entries()].find(([k]) =>
    k.toLowerCase().includes("data model")
  );
  const dmText = dmEntry ? dmEntry[1].toLowerCase() : "";

  // Collect entity names from ### headings in data model section, or bold items
  const dmEntities = new Set();
  if (dmEntry) {
    const entityHeadingRe = /###\s+(.+)/g;
    let em;
    while ((em = entityHeadingRe.exec(dmEntry[1])) !== null) {
      dmEntities.add(em[1].trim().toLowerCase());
    }
    // Also check for bold entity names like **EntityName**
    const boldRe = /\*\*(\w+)\*\*/g;
    while ((em = boldRe.exec(dmEntry[1])) !== null) {
      dmEntities.add(em[1].trim().toLowerCase());
    }
    // Table rows with | Entity |
    const tableRe = /^\|\s*([A-Z]\w+)\s*\|/gm;
    while ((em = tableRe.exec(dmEntry[1])) !== null) {
      dmEntities.add(em[1].trim().toLowerCase());
    }
  }

  // Extract entity names from FRs and USs
  const entityMentions = new Set();
  const entityNameRe = /\b(Account|Contact|Order|OrderItem|Product|Brand|Territory|User|Activity|Commission|Opportunity|Pipeline|EmailRecord|EmailTemplate|LineCard|Organization|BusinessRule|Demo)\b/g;
  const allReqText = [...frs.map((f) => f.text), ...uss.map((u) => u.text)].join(" ");
  let em;
  while ((em = entityNameRe.exec(allReqText)) !== null) {
    entityMentions.add(em[1].toLowerCase());
  }

  const missingEntities = [...entityMentions].filter((e) => {
    // Check if the entity name appears anywhere in the data model text
    return !dmText.includes(e);
  });

  if (missingEntities.length === 0 || dmEntities.size === 0 && !dmEntry) {
    if (!dmEntry) {
      fail("traceability", "Entity names appear in Data Model", "Data Model section not found");
    } else if (missingEntities.length === 0) {
      pass("traceability", "Entity names appear in Data Model");
    }
  } else if (missingEntities.length === 0) {
    pass("traceability", "Entity names appear in Data Model");
  } else {
    fail(
      "traceability",
      "Entity names appear in Data Model",
      `Entities in requirements but not in Data Model: ${missingEntities.join(", ")}`
    );
  }

  // No orphan user stories (same as "every US references at least one FR" — already tested)
  if (usWithoutFR.length === 0) {
    pass("traceability", "No orphan user stories");
  } else {
    fail(
      "traceability",
      "No orphan user stories",
      `Orphan USs: ${usWithoutFR.map((u) => u.id).join(", ")}`
    );
  }

  // No orphan requirements (same as "every FR referenced by at least one US")
  if (unreferencedFRs.length === 0) {
    pass("traceability", "No orphan requirements");
  } else {
    fail(
      "traceability",
      "No orphan requirements",
      `Orphan FRs: ${unreferencedFRs.map((f) => f.id).join(", ")}`
    );
  }

  // ── EDGE CASE & ERROR COVERAGE ────────────────────────────────────────

  // Every US has Error/Edge Cases subsection
  const usWithoutEdge = usBlocks.filter((usb) => {
    return !/error\s*\/?\s*edge\s*case/i.test(usb.content);
  });
  if (usBlocks.length === 0) {
    fail("edgeCases", "Every US has Error/Edge Cases subsection", "No user stories found");
  } else if (usWithoutEdge.length === 0) {
    pass("edgeCases", "Every US has Error/Edge Cases subsection");
  } else {
    fail(
      "edgeCases",
      "Every US has Error/Edge Cases subsection",
      `USs missing Error/Edge Cases: ${usWithoutEdge.map((u) => u.id).join(", ")}`
    );
  }

  // UI/UX includes loading states, error states, empty states
  const uiuxEntry = [...sections.entries()].find(([k]) =>
    k.toLowerCase().includes("ui/ux")
  );
  const uiuxText = uiuxEntry ? uiuxEntry[1].toLowerCase() : "";

  const uiKeywords = [
    { keyword: "loading state", label: "loading states" },
    { keyword: "error state", label: "error states" },
    { keyword: "empty state", label: "empty states" },
  ];

  // Check for each keyword individually but report as one test
  const missingUIKeywords = uiKeywords.filter((uk) => !uiuxText.includes(uk.keyword));
  if (!uiuxEntry) {
    fail("edgeCases", "UI/UX includes loading states", "UI/UX section not found");
  } else if (missingUIKeywords.length === 0) {
    pass("edgeCases", "UI/UX includes loading states");
  } else {
    fail(
      "edgeCases",
      "UI/UX includes loading states",
      `Missing UI/UX keywords: ${missingUIKeywords.map((k) => k.label).join(", ")}`
    );
  }

  // At least one NFR addresses security
  const securityNFR = nfrs.some((n) =>
    /security|encrypt|auth|tls|ssl|owasp|rbac|rls|xss|csrf|injection|compliance|audit|access control/i.test(n.text)
  );
  if (securityNFR) {
    pass("edgeCases", "At least one NFR addresses security");
  } else {
    fail("edgeCases", "At least one NFR addresses security", "No security-related NFR found");
  }

  // At least one NFR addresses performance with response time
  const perfNFR = nfrs.some((n) =>
    /(\d+\s*(ms|millisecond|second|s)\b|response time|latency|p95|p99|page load)/i.test(n.text)
  );
  if (perfNFR) {
    pass("edgeCases", "At least one NFR addresses performance with response time");
  } else {
    fail(
      "edgeCases",
      "At least one NFR addresses performance with response time",
      "No performance NFR with specific response time found"
    );
  }

  // ── CONFLICT DETECTION ────────────────────────────────────────────────

  // Scan for FRs that reference the same entity/action with different outcomes
  // This is a heuristic: flag pairs where the same entity + verb appear with contradictory modifiers
  const conflictWarnings = [];
  for (let i = 0; i < frs.length; i++) {
    for (let j = i + 1; j < frs.length; j++) {
      const a = frs[i].text.toLowerCase();
      const b = frs[j].text.toLowerCase();

      // Extract key entities and verbs
      const entitiesA = a.match(/\b(account|order|product|contact|commission|territory|brand|email|activity|pipeline|opportunity|user|report)\b/g) || [];
      const entitiesB = b.match(/\b(account|order|product|contact|commission|territory|brand|email|activity|pipeline|opportunity|user|report)\b/g) || [];

      const sharedEntities = entitiesA.filter((e) => entitiesB.includes(e));
      if (sharedEntities.length === 0) continue;

      // Check for contradictory keywords
      const contradictions = [
        ["must", "must not"],
        ["shall", "shall not"],
        ["required", "optional"],
        ["always", "never"],
        ["enable", "disable"],
        ["allow", "prevent"],
        ["include", "exclude"],
      ];

      for (const [pos, neg] of contradictions) {
        if ((a.includes(pos) && b.includes(neg)) || (a.includes(neg) && b.includes(pos))) {
          conflictWarnings.push(
            `Potential conflict: ${frs[i].id} and ${frs[j].id} reference "${sharedEntities[0]}" with "${pos}"/"${neg}" — review needed`
          );
        }
      }
    }
  }

  if (conflictWarnings.length === 0) {
    pass("conflicts", "No contradictory FRs detected");
  } else {
    // These are warnings since they're heuristic
    for (const cw of conflictWarnings) warn(cw);
    pass("conflicts", "No contradictory FRs detected");
  }

  // Tech constraints vs FR conflicts
  const tcEntry = [...sections.entries()].find(([k]) =>
    k.toLowerCase().includes("technical constraints")
  );
  const tcText = tcEntry ? tcEntry[1].toLowerCase() : "";
  const tcConflicts = [];

  // Look for limitations mentioned in tech constraints
  const limitationPatterns = [
    { pattern: /no\s+(?:support for|native)\s+(\w+)/gi, type: "exclusion" },
    { pattern: /(?:not|cannot|won't)\s+(?:support|handle|provide)\s+(\w+)/gi, type: "limitation" },
    { pattern: /maximum\s+(\d+)/gi, type: "cap" },
  ];

  for (const lp of limitationPatterns) {
    let lm;
    while ((lm = lp.pattern.exec(tcText)) !== null) {
      const limitation = lm[0];
      // Check if any FR requires the limited capability
      for (const fr of frs) {
        const frLower = fr.text.toLowerCase();
        if (lm[1] && frLower.includes(lm[1].toLowerCase())) {
          tcConflicts.push(
            `Potential conflict: Tech constraint "${limitation}" may conflict with ${fr.id}`
          );
        }
      }
    }
  }

  if (tcConflicts.length === 0) {
    pass("conflicts", "No tech constraint conflicts with FRs");
  } else {
    for (const tc of tcConflicts) warn(tc);
    pass("conflicts", "No tech constraint conflicts with FRs");
  }

  // ── METRICS & MEASURABILITY ───────────────────────────────────────────

  // Success metrics contain numbers/percentages
  const smRe = /###.*success\s*metrics/i;
  let smText = "";
  if (overviewText) {
    const smMatch = overviewText.match(/###.*Success\s*Metrics([\s\S]*?)(?=###|$)/i);
    if (smMatch) smText = smMatch[1];
  }

  if (smText.length === 0) {
    fail("metrics", "Success metrics contain numbers/percentages", "Success Metrics subsection not found or empty");
  } else {
    // Check each bullet point for a number
    const smBullets = smText.split("\n").filter((l) => /^\s*[-*]/.test(l));
    const smWithoutNumbers = smBullets.filter((l) => !/\d+/.test(l));
    if (smWithoutNumbers.length === 0) {
      pass("metrics", "Success metrics contain numbers/percentages");
    } else {
      fail(
        "metrics",
        "Success metrics contain numbers/percentages",
        `${smWithoutNumbers.length} metrics without numbers`
      );
    }
  }

  // AC/FR ratio >= 1.5
  const acFrRatio = frs.length > 0 ? acs.length / frs.length : 0;
  if (acFrRatio >= 1.5) {
    pass("metrics", "AC/FR ratio >= 1.5");
  } else {
    fail(
      "metrics",
      "AC/FR ratio >= 1.5",
      `AC/FR ratio is ${acFrRatio.toFixed(2)} (${acs.length} ACs / ${frs.length} FRs). Need at least 1.5`
    );
  }

  // Total FR count >= 5
  if (frs.length >= 5) {
    pass("metrics", "Total FR count >= 5");
  } else {
    fail("metrics", "Total FR count >= 5", `Only ${frs.length} FRs found`);
  }

  // Total US count >= 3
  if (uss.length >= 3) {
    pass("metrics", "Total US count >= 3");
  } else {
    fail("metrics", "Total US count >= 3", `Only ${uss.length} USs found`);
  }

  // Build summary
  summary = {
    frCount: frs.length,
    nfrCount: nfrs.length,
    usCount: uss.length,
    acCount: acs.length,
    acFrRatio: acFrRatio.toFixed(2),
    entityCount: dmEntities.size,
    openQuestions: oqEntry
      ? (oqEntry[1].match(/^\s*[-*]\s/gm) || []).length +
        (oqEntry[1].match(/HUMAN DECISION NEEDED/gi) || []).length
      : 0,
    humanDecisions: (md.match(/HUMAN DECISION NEEDED/gi) || []).length,
  };
}

// ─── Output Report ──────────────────────────────────────────────────────────

const DIVIDER = "═".repeat(51);
const LINE = "─".repeat(51);

console.log();
console.log(DIVIDER);
console.log("  PRD VALIDATION REPORT");
console.log(DIVIDER);

let totalTests = 0;
let totalPassed = 0;

for (const [, cat] of Object.entries(results)) {
  const passed = cat.tests.filter((t) => t.passed).length;
  const total = cat.tests.length;
  totalTests += total;
  totalPassed += passed;
  const status = passed === total ? "PASS" : "FAIL";
  const label = cat.label.padEnd(25);
  console.log(`  ${label} ${String(passed).padStart(2)}/${String(total).padStart(2)}   ${status}`);
}

console.log(DIVIDER);
const allPass = totalPassed === totalTests;
const totalLabel = "TOTAL:".padEnd(25);
console.log(
  `  ${totalLabel} ${String(totalPassed).padStart(2)}/${String(totalTests).padStart(2)}   ${allPass ? "ALL PASS" : "FAILURES"}`
);
console.log(DIVIDER);

if (md) {
  console.log();
  console.log("  Summary:");
  console.log(`  - Functional Requirements: ${summary.frCount}`);
  console.log(`  - Non-Functional Requirements: ${summary.nfrCount}`);
  console.log(`  - User Stories: ${summary.usCount}`);
  console.log(`  - Acceptance Criteria: ${summary.acCount}`);
  console.log(`  - AC/FR Ratio: ${summary.acFrRatio}`);
  console.log(`  - Data Model Entities: ${summary.entityCount}`);
  console.log(`  - Open Questions: ${summary.openQuestions}`);
  console.log(`  - Human Decisions Needed: ${summary.humanDecisions}`);
}

if (warnings.length > 0) {
  console.log();
  console.log("  WARNINGS:");
  for (const w of warnings) console.log(`  - ${w}`);
}

if (failures.length > 0) {
  console.log();
  console.log("  FAILURES:");
  for (const f of failures) {
    const lineInfo = f.line ? ` (line ${f.line})` : "";
    console.log(`  - ${f.name}${lineInfo}: ${f.detail}`);
  }
}

console.log();
process.exit(allPass ? 0 : 1);
