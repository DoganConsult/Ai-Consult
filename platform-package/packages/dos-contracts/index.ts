import type { ConsultationModel, ContactModel, TenancyBounds } from '@dos/types';

// Extraction-ready boundaries mapping to exact bounded operations for remote invokability.

export interface IConsultationService {
  submit(payload: ConsultationModel, context: TenancyBounds): Promise<{ id: string; createdAt: Date }>;
  getStats(context: TenancyBounds): Promise<{ total: number; byStatus: Record<string, number> }>;
}

export interface IContactService {
  submit(payload: ContactModel, context: TenancyBounds): Promise<{ id: string; createdAt: Date }>;
}

// Represents Microsoft Graph replacement bounded contract
export interface IEnterpriseCommunications {
  sendEmail(to: string[], subject: string, body: string, context: TenancyBounds): Promise<{ success: boolean }>;
  pollInbox(folder: string, limit: number, context: TenancyBounds): Promise<any[]>;
}

export interface ISbgEntityService {
  list(entityName: string, filters: Record<string, any>, limit: number, context: TenancyBounds): Promise<any[]>;
  get(entityName: string, id: string, context: TenancyBounds): Promise<any>;
  create(entityName: string, data: Record<string, any>, context: TenancyBounds): Promise<any>;
  update(entityName: string, id: string, data: Record<string, any>, context: TenancyBounds): Promise<any>;
}

export interface ISbgAgentService {
  createConversation(title: string, agentId: string, context: TenancyBounds): Promise<any>;
  getConversation(id: string, context: TenancyBounds): Promise<any>;
  addMessage(id: string, content: string, role: string, context: TenancyBounds): Promise<{ messages: any[], reply: string | null }>;
}

export interface ISbgFunctionService {
  execute(name: string, payload: Record<string, any>, context: TenancyBounds): Promise<any>;
}

export interface ISbgIntegrationService {
  invokeLlm(prompt: string, messages: any[], model: string, context: TenancyBounds): Promise<{ response: string, usage: any }>;
  sendEmail(to: string[], subject: string, body: string, context: TenancyBounds): Promise<{ success: boolean }>;
}
