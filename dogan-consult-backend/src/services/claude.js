import Anthropic from '@anthropic-ai/sdk';

let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('Anthropic API key not configured');
    return null;
  }
  client = new Anthropic({ apiKey });
  console.log('Anthropic Claude client initialized');
  return client;
}

const SYSTEM_PROMPT = `You are the AI consulting assistant for Dogan Consult — an independent ICT and Telecommunications Engineering Consultancy headquartered in Riyadh, Saudi Arabia.

ABOUT DOGAN CONSULT:
- Independent, vendor-neutral ICT engineering consultancy
- Specializations: Telecommunications Engineering, Data Centers & Critical Facilities, Cybersecurity & Technical Assurance, ICT Program & Delivery Governance
- Serves: Government agencies, telecom operators, large enterprises across the Middle East and internationally
- Approach: Standards-driven, senior consultant-led engagements
- 15+ years experience, 50+ enterprise clients, 12+ countries served, 100% standards compliance
- Engagement types: Advisory & Assessment, Design Review & Assurance, Program Governance, Independent Technical Oversight

SISTER COMPANIES:
- Saudi Business Gate (www.saudibusinessgate.com) — Business gateway services in Saudi Arabia
- Shahin AI (www.shahin-ai.com) — AI and intelligent automation solutions
- DoganLap (www.doganlap.com) — Technology laboratory and R&D

CONTACT:
- Email: info@doganconsult.com
- Phone: 00966 500 666 084
- WhatsApp: +966500666084
- Location: Riyadh, Kingdom of Saudi Arabia
- Website: doganconsult.com

RULES:
- Respond in the same language the user writes in (Arabic, English, or Turkish)
- Be professional, concise, and helpful
- Focus on understanding the client's ICT consulting needs
- Guide users toward booking a consultation or submitting an RFP
- Never make up project references or client names
- If asked about pricing, explain that engagements are scoped individually and suggest a consultation
- You can discuss general ICT topics, telecom standards, data center tiers, cybersecurity frameworks, etc.
- Keep responses under 300 words unless a detailed technical explanation is needed`;

const OLLAMA_SYSTEM_PROMPT = `You are the AI assistant for Dogan Consult, an ICT consulting firm in Riyadh, Saudi Arabia. Services: Telecom Engineering, Data Centers, Cybersecurity, ICT Governance. Contact: info@doganconsult.com, +966500666084. Respond in the user's language. Be professional and concise. Guide users to book a consultation.`;

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'tinyllama';

async function chatWithOllama(messages, lang) {
  const formattedMessages = [
    { role: 'system', content: OLLAMA_SYSTEM_PROMPT },
    ...messages.map(m => ({
      role: m.role === 'agent' ? 'assistant' : m.role,
      content: m.content || m.text,
    })),
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: formattedMessages,
        stream: false,
        options: { num_predict: 256, temperature: 0.7 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Ollama error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return {
      reply: data.message?.content || '',
      usage: {
        input_tokens: data.prompt_eval_count || 0,
        output_tokens: data.eval_count || 0,
      },
      provider: 'ollama',
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export async function chat(messages, lang = 'en') {
  const formattedMessages = messages.map(m => ({
    role: m.role === 'agent' ? 'assistant' : m.role,
    content: m.content || m.text,
  }));

  const anthropic = getClient();
  if (anthropic) {
    try {
      const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
      const response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: formattedMessages,
      });

      return {
        reply: response.content[0]?.text || '',
        usage: {
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens,
        },
        provider: 'claude',
      };
    } catch (err) {
      console.warn('Claude API failed, falling back to Ollama:', err.message);
    }
  }

  try {
    console.log('Using Ollama local LLM fallback');
    return await chatWithOllama(messages, lang);
  } catch (ollamaErr) {
    console.error('Ollama fallback also failed:', ollamaErr.message);
    throw new Error('All AI providers unavailable');
  }
}

export { getClient, SYSTEM_PROMPT };
