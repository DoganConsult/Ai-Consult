import { logger } from '../../../platform/dos/observability/logger.service';
// ============================================================
// Dogan Operating System — Guardian Orchestrator
// Manages lifecycle of all guardian workers
// ============================================================

import { Pool } from 'pg';
import { BaseDoganGuardian, GuardianHealth } from './base-dogan-guardian.worker';
import { SecurityGuardian } from './security-guardian.worker';
import { HealthGuardian } from './health-guardian.worker';
import { DataIntegrityGuardian } from './data-integrity-guardian.worker';
import { ConfigGuardian } from './config-guardian.worker';
import { PlanComplianceGuardian } from './plan-compliance-guardian.worker';
import { AIRegulatoryComplianceGuardian } from './ai-regulatory-compliance-guardian.worker';

export interface OrchestratorHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  guardians: GuardianHealth[];
  timestamp: string;
}

/**
 * Central orchestrator for all Dogan OS guardian workers.
 * Registers, starts, stops, and reports on guardian health.
 */
export class DoganGuardianOrchestrator {
  private guardians: BaseDoganGuardian[] = [];

  /** Register a guardian worker for lifecycle management. */
  registerGuardian(guardian: BaseDoganGuardian): void {
    this.guardians.push(guardian);
  }

  /** Start all registered guardians. */
  async startAll(): Promise<void> {
    logger.info(`[DoganOS:Orchestrator] Starting ${this.guardians.length} guardian(s)`);
    for (const g of this.guardians) {
      await g.start();
    }
  }

  /** Stop all registered guardians. */
  async stopAll(): Promise<void> {
    logger.info(`[DoganOS:Orchestrator] Stopping ${this.guardians.length} guardian(s)`);
    for (const g of this.guardians) {
      await g.stop();
    }
  }

  /** Aggregate health from all guardians. */
  getHealthReport(): OrchestratorHealthReport {
    const guardians = this.guardians.map((g) => g.getHealth());
    const errorGuardians = guardians.filter((h) => h.status === 'unhealthy');

    let status: OrchestratorHealthReport['status'] = 'healthy';
    if (errorGuardians.length === guardians.length && guardians.length > 0) {
      status = 'unhealthy';
    } else if (errorGuardians.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      guardians,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Factory: create an orchestrator with the default set of guardians.
   */
  static createDefaultOrchestrator(pool: Pool): DoganGuardianOrchestrator {
    const orchestrator = new DoganGuardianOrchestrator();
    orchestrator.registerGuardian(new SecurityGuardian(pool));
    orchestrator.registerGuardian(new HealthGuardian(pool));
    orchestrator.registerGuardian(new DataIntegrityGuardian(pool));
    orchestrator.registerGuardian(new ConfigGuardian(pool));
    orchestrator.registerGuardian(new PlanComplianceGuardian(pool));
    orchestrator.registerGuardian(new AIRegulatoryComplianceGuardian(pool));
    return orchestrator;
  }
}
