import OpenAI from "openai";
import { checkOpenAIKey, isKeyFormatValid } from "./openai-key-checker";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;
let keyValidated = false;

async function initializeOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY не установлен в переменных окружения');
    return false;
  }

  if (!isKeyFormatValid(apiKey)) {
    console.error('❌ Неверный формат OpenAI API ключа');
    return false;
  }

  try {
    console.log('🔍 Проверяем OpenAI API ключ...');
    const keyInfo = await checkOpenAIKey(apiKey);
    
    if (keyInfo.isValid) {
      openai = new OpenAI({ apiKey });
      keyValidated = true;
      console.log('✅ OpenAI API ключ валиден');
      console.log(`📊 Доступ к GPT-4: ${keyInfo.hasGPT4Access ? 'Да' : 'Нет'}`);
      if (keyInfo.rateLimitRPM) console.log(`🔄 Лимит запросов: ${keyInfo.rateLimitRPM}/мин`);
      return true;
    } else {
      console.error('❌ OpenAI API ключ невалиден:', keyInfo.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке OpenAI API ключа:', error);
    return false;
  }
}

// Инициализируем при загрузке модуля
initializeOpenAI();

export async function generateBotResponse(userMessage: string, chatHistory: Array<{role: 'user' | 'assistant', content: string}> = []): Promise<string> {
  if (!openai || !keyValidated) {
    console.error('OpenAI not initialized or key invalid');
    return 'Извините, AI репетитор временно недоступен. Проверьте настройку API ключа.';
  }

  try {
    const systemPrompt = `Ты - виртуальный помощник и репетитор русского языка по имени "AI Репетитор". 
    Ты помогаешь студентам изучать русский язык, отвечаешь на вопросы по грамматике, лексике, литературе.
    Твои ответы должны быть:
    - Полезными и образовательными
    - Понятными для изучающих русский язык
    - Дружелюбными и поддерживающими
    - Относительно краткими (2-3 предложения)
    - На русском языке
    
    Если тебя спрашивают о чем-то не связанном с изучением русского языка, вежливо переведи разговор обратно к образовательным темам.`;

    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0].message.content || 'Извините, произошла ошибка. Попробуйте еще раз.';
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'Извините, у меня временные технические проблемы. Попробуйте написать позже.';
  }
}

export async function isEducationalQuestion(message: string): Promise<boolean> {
  // Simple check - if message contains educational keywords or is a question
  const educationalKeywords = [
    'как', 'что', 'где', 'когда', 'почему', 'зачем', 'какой', 'какая', 'какое',
    'грамматика', 'правило', 'ошибка', 'правильно', 'слово', 'предложение',
    'склонение', 'спряжение', 'падеж', 'время', 'вид', 'литература', 'автор',
    'произношение', 'ударение', 'значение', 'синоним', 'антоним'
  ];
  
  const lowerMessage = message.toLowerCase();
  return educationalKeywords.some(keyword => lowerMessage.includes(keyword)) || 
         message.includes('?') || 
         message.length > 10; // Assume longer messages are more likely to be educational
}