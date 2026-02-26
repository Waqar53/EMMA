import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callLLM(messages: LLMMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const { temperature = 0.3, maxTokens = 1024 } = options || {};
  try {
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature,
      max_tokens: maxTokens,
      top_p: 1,
      stream: false,
    });
    return completion.choices[0]?.message?.content || "I apologize, I wasn't able to process that. Could you repeat what you said?";
  } catch (error: unknown) {
    console.error('LLM Gateway Error:', error);
    if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 429) {
      return "I'm experiencing a brief delay. Could you repeat what you said?";
    }
    return "I apologize, I'm experiencing a temporary technical issue. Let me transfer you to a receptionist who can help.";
  }
}
