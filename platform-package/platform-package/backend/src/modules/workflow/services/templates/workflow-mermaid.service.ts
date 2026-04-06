// ============================================
// AGRC-OS — Workflow Mermaid Service (Re-export Barrel)
//
// The canonical implementation lives in:
//   services/core/workflow-mermaid.service.ts
//
// This barrel re-exports everything from the canonical location
// so that existing imports from this path continue to work.
//
// Law 1: One canonical engine per concern — no duplicate logic.
// ============================================

export {
  buildExecutionMermaid,
  generateWorkflowDiagram,
  generateTemplateDiagram,
  generateStateTransitionDiagram,
  formatAsFlowchart,
  formatAsSequenceDiagram,
} from '../core/workflow-mermaid.service';
