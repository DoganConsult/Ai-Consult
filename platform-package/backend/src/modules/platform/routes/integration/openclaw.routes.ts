import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { gatewayChat } from '../../../ai/services/gateway/ai-gateway.service';
import { logger } from '../../../../platform/dos/observability/logger.service';

const router = Router();

const DEFAULT_SYSTEM_PROMPT = `You are Dr Dogan Assistance, the front-office AI assistant for Dogan Consult — a consulting and engineering firm. Answer questions about the company's services professionally and helpfully. If the user writes in Arabic, reply in Arabic. If they write in English, reply in English.`;

router.post('/chat', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messages, systemPrompt, settings, lang, routeContext, sessionId } = req.body;
    const tenantId = (req as any).tenantId || 'public-chat';

    const chatMessages = (messages || []).map((m: any) => ({
      role: m.role || 'user',
      content: m.content || m.text || '',
    }));

    const result = await gatewayChat(
      tenantId,
      systemPrompt || DEFAULT_SYSTEM_PROMPT,
      chatMessages,
      { ...(settings || {}), maxTokens: 1024 }
    );

    res.json({
      text: typeof result === 'string' ? result : (result as any)?.text || '',
      sessionId: sessionId || randomUUID(),
    });
  } catch (error: any) {
    logger.error('[OpenClaw] Chat Error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
