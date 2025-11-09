// Utility functions for building prompts and handling data

import { RUBRIC_CRITERIA } from "./rubric.js";

export interface Artifact {
  name: string;
  content: string;
  kind?: string;
}

export interface UserBlockOptions {
  prd_text: string;
  artifacts?: Artifact[];
  sections?: string[];
  rubric_version?: string;
}

export function buildUserBlock(options: UserBlockOptions): string {
  const { prd_text, artifacts = [], sections = [], rubric_version = "v1.0" } = options;

  let userBlock = `# PRD to Evaluate\n\n${prd_text}\n\n`;

  if (artifacts.length > 0) {
    userBlock += `# Supporting Artifacts\n\n`;
    for (const artifact of artifacts) {
      userBlock += `## ${artifact.name}`;
      if (artifact.kind) {
        userBlock += ` (${artifact.kind})`;
      }
      userBlock += `\n\n${artifact.content}\n\n`;
    }
  }

  if (sections.length > 0) {
    userBlock += `# Focus Sections\n\nPrioritize evaluation of these sections: ${sections.join(", ")}\n\n`;
  }

  userBlock += `# Rubric\n\nUse rubric version ${rubric_version} with the following 11 criteria:\n\n`;
  for (const criterion of RUBRIC_CRITERIA) {
    userBlock += `- **${criterion.id}**: ${criterion.name}${criterion.gating ? " (GATING)" : ""}\n`;
  }

  return userBlock;
}

export function hashString(str: string): string {
  // Simple hash for logging (not cryptographic)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
