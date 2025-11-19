/**
 * Summarize Server Actions
 * セッションの会話を要約する
 */

'use server';

import OpenAI from 'openai';
import { getSessionUtterances } from '@/lib/supabase/session';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 会話を要約する
 * @param sessionId セッションID
 * @returns 要約テキスト
 */
export async function summarizeConversationAction(sessionId: string): Promise<string> {
  try {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // セッションの発話を取得
    const utterances = await getSessionUtterances(sessionId);

    if (utterances.length === 0) {
      throw new Error('No utterances found in this session');
    }

    // 会話のテキストを結合
    const conversationText = utterances.map(u => `${u.speaker}: ${u.text}`).join('\n');

    // OpenAI GPTで要約
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '会話を簡潔に要約してください。重要なポイントを箇条書きで3-5個にまとめてください。日本語で回答してください。',
        },
        {
          role: 'user',
          content: `以下の会話を要約してください:\n\n${conversationText}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = completion.choices[0].message.content;

    if (!summary) {
      throw new Error('Failed to generate summary');
    }

    return summary;
  } catch (error) {
    console.error('[summarizeConversationAction] エラー:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate summary');
  }
}
