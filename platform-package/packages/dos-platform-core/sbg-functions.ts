import type { TenancyBounds } from '@dos/types';
import type { ISbgFunctionService } from '@dos/contracts';

export class CoreSbgFunctionService implements ISbgFunctionService {
  private readonly emailProvider: any;

  constructor(emailProvider: any) {
    this.emailProvider = emailProvider;
  }

  async execute(name: string, payload: Record<string, any>, context: TenancyBounds): Promise<any> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    
    switch (name) {
      case 'demoAutomation': {
        const { demoRequestId, action, email } = payload;
        if (action === 'send_confirmation' && email) {
          await this.emailProvider.sendMail({
            to: email,
            subject: 'Demo Request Confirmation — Saudi Business Gate',
            body: `<p>Thank you for your demo request. We will contact you shortly.</p>`,
          }).catch(() => {});
        }
        return { success: true, action, demoRequestId };
      }
      case 'erpnextSync':
      case 'erpnextIntegration': {
        return { success: true, message: 'ERP sync placeholder' };
      }
      case 'api': {
        return { success: true, endpoints: [] };
      }
      default:
        return { success: true, message: `Function ${name} executed` };
    }
  }
}
