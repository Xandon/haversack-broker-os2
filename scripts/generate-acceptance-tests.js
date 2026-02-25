#!/usr/bin/env node
/**
 * Acceptance Test Skeleton Generator
 *
 * Reads spec.md, extracts all Given/When/Then acceptance scenarios,
 * and generates Playwright test skeletons for each user story.
 *
 * Usage: node scripts/generate-acceptance-tests.js
 */

const fs = require('fs');
const path = require('path');

const SPEC_DIR = path.join(__dirname, '..', '.specify', 'specs', '001-haversack-unified-platform');
const SPEC_FILE = path.join(SPEC_DIR, 'spec.md');
const OUTPUT_DIR = path.join(__dirname, '..', 'e2e', 'tests', 'acceptance');

function parseSpec(content) {
  const stories = [];
  const lines = content.split('\n');
  let currentStory = null;
  let inAcceptanceScenarios = false;
  let scenarioBuffer = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match user story headers: ### User Story N - Title (Priority: PX)
    const storyMatch = line.match(/^### User Story (\d+) - (.+?) \(Priority: (P\d)\)/);
    if (storyMatch) {
      if (currentStory) {
        stories.push(currentStory);
      }
      currentStory = {
        number: parseInt(storyMatch[1], 10),
        title: storyMatch[2].trim(),
        priority: storyMatch[3],
        scenarios: [],
        covers: [],
      };
      inAcceptanceScenarios = false;
      scenarioBuffer = '';
      continue;
    }

    if (!currentStory) continue;

    // Detect acceptance scenarios section
    if (line.match(/^\*\*Acceptance Scenarios\*\*:/)) {
      inAcceptanceScenarios = true;
      continue;
    }

    // Detect covers line
    const coversMatch = line.match(/^\*\*Covers\*\*: (.+)/);
    if (coversMatch) {
      currentStory.covers = coversMatch[1].split(',').map((s) => s.trim());
      inAcceptanceScenarios = false;
      continue;
    }

    // End of story (next story or HR)
    if (line.match(/^---/) && currentStory) {
      if (scenarioBuffer.trim()) {
        currentStory.scenarios.push(parseScenario(scenarioBuffer));
        scenarioBuffer = '';
      }
      continue;
    }

    if (inAcceptanceScenarios) {
      // New scenario starts with numbered list
      const scenarioStart = line.match(/^\d+\.\s+\*\*Given\*\*/);
      if (scenarioStart) {
        if (scenarioBuffer.trim()) {
          currentStory.scenarios.push(parseScenario(scenarioBuffer));
        }
        scenarioBuffer = line;
      } else if (scenarioBuffer) {
        scenarioBuffer += ' ' + line.trim();
      }
    }
  }

  // Push last story
  if (currentStory) {
    if (scenarioBuffer.trim()) {
      currentStory.scenarios.push(parseScenario(scenarioBuffer));
    }
    stories.push(currentStory);
  }

  return stories;
}

function parseScenario(text) {
  // Extract Given/When/Then from the scenario text
  const cleaned = text.replace(/^\d+\.\s+/, '').trim();

  const givenMatch = cleaned.match(/\*\*Given\*\*\s+(.+?),?\s+\*\*When\*\*/);
  const whenMatch = cleaned.match(/\*\*When\*\*\s+(.+?),?\s+\*\*Then\*\*/);
  const thenMatch = cleaned.match(/\*\*Then\*\*\s+(.+)/);

  return {
    full: cleaned,
    given: givenMatch ? givenMatch[1].trim().replace(/,\s*$/, '') : '',
    when: whenMatch ? whenMatch[1].trim().replace(/,\s*$/, '') : '',
    then: thenMatch ? thenMatch[1].trim().replace(/\.$/, '') : '',
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateTestFile(story) {
  const usId = `US-${String(story.number).padStart(3, '0')}`;
  const testCases = story.scenarios
    .map((scenario, idx) => {
      const scenarioId = `${usId}-AC${idx + 1}`;
      return `
  test('${scenarioId}: Given ${escapeQuotes(scenario.given)}, When ${escapeQuotes(scenario.when)}, Then ${escapeQuotes(scenario.then)}', async ({ page: _page }) => {
    // Given: ${scenario.given}
    // When: ${scenario.when}
    // Then: ${scenario.then}
    // Refs: ${story.covers.join(', ')}

    // TODO: Implement acceptance test
    test.skip(true, 'Acceptance test not yet implemented');
  });`;
    })
    .join('\n');

  return `import { test } from '@playwright/test';

/**
 * Acceptance Tests: ${usId} — ${story.title}
 * Priority: ${story.priority}
 * Covers: ${story.covers.join(', ')}
 *
 * Auto-generated from spec.md — DO NOT delete.
 * Replace TODO stubs with real test implementations.
 */

test.describe('${usId}: ${escapeQuotes(story.title)}', () => {
${testCases}
});
`;
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'");
}

// ─── Main ───────────────────────────────────────
function main() {
  if (!fs.existsSync(SPEC_FILE)) {
    console.error(`ERROR: Spec file not found at ${SPEC_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(SPEC_FILE, 'utf-8');
  const stories = parseSpec(content);

  if (stories.length === 0) {
    console.error('ERROR: No user stories found in spec.md');
    process.exit(1);
  }

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalScenarios = 0;

  for (const story of stories) {
    const usId = `US-${String(story.number).padStart(3, '0')}`;
    const slug = slugify(story.title);
    const filename = `${usId.toLowerCase()}-${slug}.spec.ts`;
    const filepath = path.join(OUTPUT_DIR, filename);

    const content = generateTestFile(story);
    fs.writeFileSync(filepath, content, 'utf-8');

    totalScenarios += story.scenarios.length;
    console.log(`  ✅ ${filename} — ${story.scenarios.length} scenarios`);
  }

  console.log('');
  console.log(`═══════════════════════════════════════════════`);
  console.log(`  Acceptance tests generated: ${totalScenarios}`);
  console.log(`  Currently passing: 0 / ${totalScenarios}`);
  console.log(`  User stories covered: ${stories.length}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`═══════════════════════════════════════════════`);
}

main();
