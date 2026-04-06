/**
 * Canonical Workflow Mermaid Service — DOS (Patch 7 §5)
 *
 * @owner DOS
 * @since 2026-03-30
 * @canonical-path platform/dos/workflows/engine/workflow-mermaid.service.ts
 *
 * Re-exports from the module-layer implementation so that
 * workflow-crud.service.ts resolves without breakage.
 */
export {
  buildExecutionMermaid,
  generateWorkflowDiagram,
  generateTemplateDiagram,
  generateStateTransitionDiagram,
  formatAsFlowchart,
  formatAsSequenceDiagram,
} from '../../../../modules/workflow/services/templates/workflow-mermaid.service';
