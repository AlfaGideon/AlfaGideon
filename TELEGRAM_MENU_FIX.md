# Устранение проблем с меню команд Telegram бота

## Если в меню все еще видны посторонние кнопки:

### Шаг 1: Перезапустите бота
```bash
./run-bot.sh
```
Команды автоматически переустановятся при запуске.

### Шаг 2: Обновите чат с ботом
1. Закройте чат с ботом в Telegram
2. Откройте чат заново
3. Нажмите на квадратное меню (рядом со скрепкой)

### Шаг 3: Принудительное обновление команд
Если проблема остается, запустите этот скрипт:

```bash
tsx -e "
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });

async function resetCommands() {
  // Удаляем все команды
  await bot.deleteMyCommands();
  console.log('Все команды удалены');
  
  // Устанавливаем только нужные команды
  await bot.setMyCommands([
    { command: 'start', description: '🚀 Начать работу с ботом' },
    { command: 'menu', description: '📋 Показать главное меню' },
    { command: 'reset', description: '🔄 Сбросить аккаунт и выбрать роль заново' },
    { command: 'help', description: '❓ Показать справку по командам' }
  ]);
  console.log('Команды установлены успешно');
  
  // Проверяем результат
  const commands = await bot.getMyCommands();
  console.log('Текущие команды:', commands);
}

resetCommands().then(() => process.exit(0)).catch(console.error);
"
```

### Шаг 4: Кеширование Telegram
Telegram может кэшировать команды до 24 часов. Для мгновенного обновления:

1. Заблокируйте бота: `/block @your_bot_username`
2. Разблокируйте бота: `/unblock @your_bot_username`
3. Команды обновятся сразу

### Ожидаемый результат:
В квадратном меню должны быть только эти команды:
- `/start` - Начать работу с ботом
- `/menu` - Показать главное меню  
- `/reset` - Сбросить аккаунт и выбрать роль заново
- `/help` - Показать справку по командам

### Если ничего не помогает:
Свяжитесь с @BotFather и используйте команду `/setcommands`, затем выберите вашего бота и установите команды вручную.