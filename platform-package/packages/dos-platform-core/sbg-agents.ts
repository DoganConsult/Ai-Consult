import type { TenancyBounds } from '@dos/types';
import type { ISbgAgentService } from '@dos/contracts';

export class CoreSbgAgentService implements ISbgAgentService {
  private readonly dbRunner: any;
  private readonly llmProvider: any;

  constructor(dbRunner: any, llmProvider: any) {
    this.dbRunner = dbRunner;
    this.llmProvider = llmProvider;
  }

  async createConversation(title: string, agentId: string, context: TenancyBounds): Promise<any> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      `INSERT INTO sbg_conversations (title, user_id, tenant_id, messages, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title || 'New Conversation', context.userId, context.tenantId, '[]', JSON.stringify({ agent_id: agentId })]
    );
    return result.rows[0];
  }

  async getConversation(id: string, context: TenancyBounds): Promise<any> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      'SELECT * FROM sbg_conversations WHERE id = $1 AND tenant_id = $2',
      [id, context.tenantId]
    );
    if (result.rows.length === 0) throw new Error('Not found');
    const conv = result.rows[0];
    if (typeof conv.messages === 'string') conv.messages = JSON.parse(conv.messages);
    return conv;
  }

  async addMessage(id: string, content: string, role: string, context: TenancyBounds): Promise<{ messages: any[], reply: string | null }> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    
    const convResult = await this.dbRunner(
      'SELECT * FROM sbg_conversations WHERE id = $1 AND tenant_id = $2',
      [id, context.tenantId]
    );
    if (convResult.rows.length === 0) throw new Error('Conversation not found');

    const conv = convResult.rows[0];
    const messages = typeof conv.messages === 'string' ? JSON.parse(conv.messages) : (conv.messages || []);
    messages.push({ role: role || 'user', content, timestamp: new Date().toISOString() });

    let aiReply = null;
    if (role !== 'assistant') {
      try {
        const chatMessages = messages.map((m: any) => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content }));
        const result = await this.llmProvider.chat(chatMessages);
        aiReply = result.reply;
        messages.push({ role: 'assistant', content: aiReply, timestamp: new Date().toISOString() });
      } catch (err: any) {
        console.error('AI reply failed:', err.message);
      }
    }

    await this.dbRunner(
      `UPDATE sbg_conversations SET messages = $1, updated_date = NOW() WHERE id = $2 AND tenant_id = $3`,
      [JSON.stringify(messages), id, context.tenantId]
    );

    return { messages, reply: aiReply };
  }
}
