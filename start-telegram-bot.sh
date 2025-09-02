
#!/bin/bash

echo "🤖 RUSSIAN MENTOR - TELEGRAM BOT"
echo "================================="

# Проверяем наличие токена
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в переменных окружения"
    echo "💡 Добавьте токен в файл .env или переменные окружения"
    exit 1
fi

echo "✅ Токен найден"
echo "🚀 Запуск Telegram бота..."

# Убиваем предыдущие процессы бота если есть
pkill -f "tsx bot/index.ts" 2>/dev/null || true

# Запускаем бота в фоновом режиме
nohup tsx bot/index.ts > /tmp/telegram-bot.log 2>&1 &

BOT_PID=$!
echo "✅ Бот запущен с PID: $BOT_PID"
echo "📋 Логи: tail -f /tmp/telegram-bot.log"
echo "🛑 Остановка: kill $BOT_PID"
echo ""
echo "🎯 Админ панель доступна только для Telegram ID: 6240695985"
echo "📱 Найдите вашего бота в Telegram и отправьте /start"

# Ждем 3 секунды и проверяем статус
sleep 3
if kill -0 $BOT_PID 2>/dev/null; then
    echo "🟢 Бот успешно запущен и работает!"
else
    echo "🔴 Ошибка запуска бота. Проверьте логи: cat /tmp/telegram-bot.log"
fi
