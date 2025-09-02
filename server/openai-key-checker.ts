
import axios from 'axios';

export interface OpenAIKeyInfo {
  isValid: boolean;
  hasGPT4Access: boolean;
  organization?: string;
  rateLimitRPM?: number;
  rateLimitTPM?: number;
  error?: string;
}

export async function checkOpenAIKey(apiKey: string): Promise<OpenAIKeyInfo> {
  try {
    // Проверяем валидность ключа через API models
    const modelsResponse = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const models = modelsResponse.data.data || [];
    const gpt4Models = models.filter((model: any) => 
      model.id.includes('gpt-4') || model.id.includes('gpt-4o')
    );

    // Получаем информацию об организации и лимитах из headers
    const rateLimitRPM = modelsResponse.headers['x-ratelimit-limit-requests'];
    const rateLimitTPM = modelsResponse.headers['x-ratelimit-limit-tokens'];

    return {
      isValid: true,
      hasGPT4Access: gpt4Models.length > 0,
      rateLimitRPM: rateLimitRPM ? parseInt(rateLimitRPM) : undefined,
      rateLimitTPM: rateLimitTPM ? parseInt(rateLimitTPM) : undefined
    };

  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      let errorMessage = 'Unknown error';

      switch (status) {
        case 401:
          errorMessage = 'Invalid API key or unauthorized access';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded';
          break;
        case 403:
          errorMessage = 'Forbidden - insufficient permissions';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = 'OpenAI API server error';
          break;
        default:
          errorMessage = `HTTP ${status}: ${error.response.data?.error?.message || 'Unknown error'}`;
      }

      return {
        isValid: false,
        hasGPT4Access: false,
        error: errorMessage
      };
    }

    return {
      isValid: false,
      hasGPT4Access: false,
      error: error.message || 'Network error or timeout'
    };
  }
}

export async function validateKeyWithTestRequest(apiKey: string): Promise<boolean> {
  try {
    // Делаем минимальный тестовый запрос к chat completions
    await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return true;
  } catch (error: any) {
    console.error('Test request failed:', error.response?.data || error.message);
    return false;
  }
}

export function isKeyFormatValid(apiKey: string): boolean {
  // OpenAI API ключи начинаются с "sk-" и имеют определенную длину
  const keyRegex = /^sk-[a-zA-Z0-9]{48,}$/;
  return keyRegex.test(apiKey);
}
