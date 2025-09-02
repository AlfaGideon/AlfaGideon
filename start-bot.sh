#!/bin/bash

# Простой запуск бота в фоновом режиме
echo "🚀 Запуск Telegram бота в фоновом режиме..."

# Убиваем предыдущие процессы бота если есть
pkill -f "tsx bot/index.ts" 2>/dev/null

# Запускаем бота
nohup tsx bot/index.ts > /tmp/telegram-bot.log 2>&1 & 

BOT_PID=$!
echo "✅ Бот запущен с PID: $BOT_PID"
echo "📋 Логи: tail -f /tmp/telegram-bot.log"
echo "🛑 Остановка: kill $BOT_PID"

# Проверяем что бот запустился
sleep 2
if kill -0 $BOT_PID 2>/dev/null; then
    echo "🤖 Бот успешно работает!"
    tail -n 5 /tmp/telegram-bot.log 2>/dev/null || echo "Логи пока пусты"
else
    echo "❌ Ошибка запуска бота"
    cat /tmp/telegram-bot.log 2>/dev/null
fi