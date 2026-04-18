import type { TenancyBounds } from '@dos/types';
import type { ISbgIntegrationService } from '@dos/contracts';

export class CoreSbgIntegrationService implements ISbgIntegrationService {
  private readonly llmProvider: any;
  private readonly emailProvider: any;

  constructor(llmProvider: any, emailProvider: any) {
    this.llmProvider = llmProvider;
    this.emailProvider = emailProvider;
  }

  async invokeLlm(prompt: string, messages: any[], model: string, context: TenancyBounds): Promise<{ response: string, usage: any }> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const msgs = messages || [{ role: 'user', content: prompt || '' }];
    
    // Safely mapping to platform core LLM routing 
    // Usually OpenClaw sits here
    const result = await this.llmProvider.chat(msgs, model);
    return { response: result.reply, usage: result.usage };
  }

  async sendEmail(to: string[], subject: string, body: string, context: TenancyBounds): Promise<{ success: boolean }> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    await this.emailProvider.sendMail({ to, subject, body });
    return { success: true };
  }
}
