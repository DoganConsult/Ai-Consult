-- Migration 356: Cross-module condition templates on dependency graph
-- Enables automation rules to reference data from other modules
-- when evaluating whether to fire a cross-module trigger.

ALTER TABLE module_dependency_graph
  ADD COLUMN IF NOT EXISTS condition_template JSONB;

-- Example condition_template:
-- {
--   "crossModule": {
--     "module": "risk",
--     "entity": "linked_risk",
--     "field": "risk_score",
--     "operator": "gte",
--     "value": 20
--   }
-- }
-- When dependency_type = 'triggers' and condition_template is set,
-- the automation engine uses it as a pre-condition before firing
-- the cross-module chain.

COMMENT ON COLUMN module_dependency_graph.condition_template IS
  'Optional JSONB pre-condition for trigger-type dependencies. Evaluated against linked entities before firing cross-module chains.';
