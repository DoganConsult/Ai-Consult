-- Runtime Error Fixes — RACI Matrix & Cadence Overrides Tables
-- Supports RACI responsibility assignments and cadence frequency overrides per tenant.

-- RACI Matrix (Req 2.1)
CREATE TABLE IF NOT EXISTS raci_matrix (
  domain         VARCHAR(255) PRIMARY KEY,
  responsible    VARCHAR(255),
  accountable    VARCHAR(255),
  consulted      VARCHAR(255),
  informed       VARCHAR(255)
);

-- Cadence Overrides (Req 3.1)
CREATE TABLE IF NOT EXISTS cadence_overrides (
  domain              VARCHAR(255) PRIMARY KEY,
  default_frequency   VARCHAR(100),
  override_frequency  VARCHAR(100)
);
