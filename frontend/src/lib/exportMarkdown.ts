// Markdown export utilities for PRD evaluation results

import type { BinaryScoreOutput, FixPlanOutput, AgentTasksOutput } from "../types/api";

/**
 * Export binary score results as formatted markdown
 */
export function exportBinaryScoreAsMarkdown(data: BinaryScoreOutput): string {
  const { criteria, pass_count, readiness_gate, prd_title } = data;
  const totalCount = criteria.length;

  let markdown = `# PRD Binary Evaluation Results\n\n`;

  if (prd_title) {
    markdown += `**PRD**: ${prd_title}\n\n`;
  }

  markdown += `## Score: ${pass_count}/${totalCount}\n\n`;
  markdown += `**Readiness Gate**: ${readiness_gate.state}\n\n`;
  markdown += `**Reason**: ${readiness_gate.reason}\n\n`;

  markdown += `---\n\n`;
  markdown += `## Criteria Evaluation\n\n`;

  // Group by pass/fail for better readability
  const passed = criteria.filter(c => c.pass);
  const failed = criteria.filter(c => !c.pass);

  if (passed.length > 0) {
    markdown += `### ✅ Passed Criteria (${passed.length})\n\n`;
    passed.forEach(criterion => {
      markdown += `#### ${criterion.id}: ${criterion.name}\n`;
      markdown += `**Status**: PASS\n\n`;
      markdown += `**Rationale**: ${criterion.rationale}\n\n`;

      if (criterion.evidence && criterion.evidence.length > 0) {
        markdown += `**Evidence**:\n`;
        criterion.evidence.forEach((ev, idx) => {
          markdown += `${idx + 1}. "${ev.quote}"\n`;
          markdown += `   - Section: ${ev.locator.section}\n`;
          if (ev.locator.page) {
            markdown += `   - Page: ${ev.locator.page}\n`;
          }
          markdown += `\n`;
        });
      }
      markdown += `\n`;
    });
  }

  if (failed.length > 0) {
    markdown += `### ❌ Failed Criteria (${failed.length})\n\n`;
    failed.forEach(criterion => {
      markdown += `#### ${criterion.id}: ${criterion.name}\n`;
      markdown += `**Status**: FAIL\n\n`;
      markdown += `**Rationale**: ${criterion.rationale}\n\n`;

      if (criterion.evidence && criterion.evidence.length > 0) {
        markdown += `**Evidence**:\n`;
        criterion.evidence.forEach((ev, idx) => {
          markdown += `${idx + 1}. "${ev.quote}"\n`;
          markdown += `   - Section: ${ev.locator.section}\n`;
          if (ev.locator.page) {
            markdown += `   - Page: ${ev.locator.page}\n`;
          }
          markdown += `\n`;
        });
      }
      markdown += `\n`;
    });
  }

  return markdown;
}

/**
 * Export fix plan as formatted markdown
 */
export function exportFixPlanAsMarkdown(data: FixPlanOutput): string {
  const { items } = data;

  let markdown = `# PRD Fix Plan\n\n`;
  markdown += `This document outlines prioritized improvements to address gaps identified in the PRD evaluation.\n\n`;
  markdown += `---\n\n`;

  // Group by priority
  const p0Items = items.filter(item => item.priority === "P0");
  const p1Items = items.filter(item => item.priority === "P1");
  const p2Items = items.filter(item => item.priority === "P2");

  const renderItems = (priorityItems: typeof items, priorityLabel: string) => {
    if (priorityItems.length === 0) return;

    markdown += `## ${priorityLabel} Items (${priorityItems.length})\n\n`;

    priorityItems.forEach((item, idx) => {
      markdown += `### ${idx + 1}. ${item.title}\n\n`;
      markdown += `**Priority**: ${item.priority}`;
      if (item.blocking) {
        markdown += ` 🚨 **BLOCKING**`;
      }
      markdown += `\n`;
      markdown += `**Effort**: ${item.effort === 'S' ? 'Small' : item.effort === 'M' ? 'Medium' : 'Large'}\n`;
      markdown += `**Impact**: ${item.impact}\n`;

      if (item.linked_criteria && item.linked_criteria.length > 0) {
        markdown += `**Linked Criteria**: ${item.linked_criteria.join(', ')}\n`;
      }

      markdown += `\n**Description**: ${item.description}\n\n`;

      if (item.steps && item.steps.length > 0) {
        markdown += `**Implementation Steps**:\n`;
        item.steps.forEach((step, stepIdx) => {
          markdown += `${stepIdx + 1}. ${step}\n`;
        });
        markdown += `\n`;
      }

      if (item.acceptance_tests && item.acceptance_tests.length > 0) {
        markdown += `**Acceptance Tests**:\n`;
        item.acceptance_tests.forEach((test, testIdx) => {
          markdown += `- [ ] ${test}\n`;
        });
        markdown += `\n`;
      }

      markdown += `\n`;
    });
  };

  renderItems(p0Items, "P0 - Critical");
  renderItems(p1Items, "P1 - High Priority");
  renderItems(p2Items, "P2 - Nice to Have");

  return markdown;
}

/**
 * Export agent tasks as formatted markdown
 */
export function exportAgentTasksAsMarkdown(data: AgentTasksOutput): string {
  const { tasks, edges } = data;

  let markdown = `# PRD Agent-Executable Task Graph\n\n`;
  markdown += `AI agent-ready tasks decomposed into 2-4 hour units with explicit entry/exit conditions and acceptance tests.\n\n`;

  const totalHours = tasks.reduce((sum, task) => sum + task.est_hours, 0);
  markdown += `**Total Estimated Effort**: ${totalHours} hours across ${tasks.length} tasks\n\n`;
  markdown += `---\n\n`;

  // Group by feature
  const tasksByFeature = tasks.reduce((acc, task) => {
    if (!acc[task.feature]) {
      acc[task.feature] = [];
    }
    acc[task.feature].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  Object.entries(tasksByFeature).forEach(([feature, featureTasks]) => {
    markdown += `## ${feature}\n\n`;

    featureTasks.forEach((task) => {
      markdown += `### Task ${task.id}: ${task.title}\n\n`;
      markdown += `**Status**: ${task.status.toUpperCase()}\n`;
      markdown += `**Duration**: ${task.duration} (${task.est_hours}h estimated)\n`;
      if (task.owner_role) {
        markdown += `**Owner Role**: ${task.owner_role}\n`;
      }
      markdown += `\n`;

      markdown += `**Description**: ${task.description}\n\n`;

      // Entry conditions
      markdown += `**Entry Condition**: ${task.entry}\n\n`;
      if (task.entry_conditions && task.entry_conditions.length > 0) {
        markdown += `**Detailed Entry Conditions**:\n`;
        task.entry_conditions.forEach((cond) => {
          markdown += `- ${cond}\n`;
        });
        markdown += `\n`;
      }

      // Exit conditions
      markdown += `**Exit Condition**: ${task.exit}\n\n`;
      if (task.exit_conditions && task.exit_conditions.length > 0) {
        markdown += `**Detailed Exit Conditions**:\n`;
        task.exit_conditions.forEach((cond) => {
          markdown += `- ${cond}\n`;
        });
        markdown += `\n`;
      }

      // Acceptance test
      markdown += `**Acceptance Test**: ${task.test}\n\n`;
      if (task.tests && task.tests.length > 0) {
        markdown += `**Detailed Tests**:\n`;
        task.tests.forEach((test) => {
          markdown += `- [ ] ${test}\n`;
        });
        markdown += `\n`;
      }

      // Inputs/Outputs
      if (task.inputs && task.inputs.length > 0) {
        markdown += `**Inputs**: ${task.inputs.join(', ')}\n\n`;
      }

      if (task.outputs && task.outputs.length > 0) {
        markdown += `**Outputs**: ${task.outputs.join(', ')}\n\n`;
      }

      markdown += `---\n\n`;
    });
  });

  // Add dependency graph if edges exist
  if (edges && edges.length > 0) {
    markdown += `## Task Dependencies\n\n`;
    edges.forEach((edge) => {
      const fromTask = tasks.find(t => t.id === edge.from);
      const toTask = tasks.find(t => t.id === edge.to);
      if (fromTask && toTask) {
        markdown += `- Task ${edge.from} (${fromTask.title}) **${edge.type}** Task ${edge.to} (${toTask.title})\n`;
      }
    });
    markdown += `\n`;
  }

  return markdown;
}

/**
 * Download markdown content as a file
 */
export function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
