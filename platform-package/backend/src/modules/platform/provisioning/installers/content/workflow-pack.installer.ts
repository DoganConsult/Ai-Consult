import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { PackManifest, ProvisioningContext, SeedInstallResult } from '../../types';

export class WorkflowPackInstaller implements SeedInstaller {
  key = 'seed_workflow_pack';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    let created = 0;

    const templateDefs = this.getTemplateDefinitions(ctx.manifestBundle);

    for (const tpl of templateDefs) {
      await query(
        `INSERT INTO "${ctx.schemaName}".workflow_templates (name, description, definition, parameters_schema, created_by)
         VALUES ($1::text, $2::text, $3::jsonb, $4::jsonb, $5::text)
         ON CONFLICT (name) DO UPDATE SET definition = $3::jsonb, description = $2::text`,
        [
          tpl.name,
          tpl.description,
          JSON.stringify(tpl.definition),
          JSON.stringify(tpl.parameters_schema ?? {}),
          ctx.actorUserId,
        ]
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      created++;
    }

    const templateNames = this.getTemplateNames(ctx.manifestBundle);
    const existingNames = new Set(templateDefs.map(t => t.name));
    for (const templateName of templateNames) {
      if (!existingNames.has(templateName)) {
        await query(
          `INSERT INTO "${ctx.schemaName}".workflow_templates (name, description, definition, parameters_schema, created_by)
           VALUES ($1::text, $2::text, $3::jsonb, '{}'::jsonb, $4::text)
           ON CONFLICT (name) DO NOTHING`,
          [
            templateName,
            `${templateName} — installed from manifest pack`,
            JSON.stringify({ nodes: [], edges: [], swimlanes: [], escalationChain: [] }),
            ctx.actorUserId,
          ]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
        created++;
      }
    }

    return { installerKey: this.key, status: 'completed', recordsCreated: created, recordsUpdated: 0 };
  }

  private getTemplateDefinitions(manifests: PackManifest[]): Array<{ name: string; description: string; definition: Record<string, any>; parameters_schema?: Record<string, any> }> {
    return manifests.flatMap((m) => m.workflow_pack?.template_definitions ?? []);
  }

  private getTemplateNames(manifests: PackManifest[]): string[] {
    return manifests.flatMap((m) => m.workflow_pack?.templates ?? []);
  }
}
