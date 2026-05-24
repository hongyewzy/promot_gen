const LONGCAT_API_KEY = process.env.LONGCAT_API_KEY;
const LONGCAT_BASE_URL = process.env.LONGCAT_BASE_URL || 'https://api.longcat.chat/anthropic';
export const LONGCAT_MODEL = 'LongCat-2.0-Preview';

export const longcat = {
  messages: {
    create: async (params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    }) => {
      const response = await fetch(`${LONGCAT_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LONGCAT_API_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`LongCat API error response (${response.status}):`, errText.substring(0, 500));
        throw new Error(`LongCat API ${response.status}: ${errText.substring(0, 200)}`);
      }

      return response.json();
    },
  },
};
