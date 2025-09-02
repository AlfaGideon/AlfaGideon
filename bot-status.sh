#!/bin/bash

echo "📊 Статус Telegram бота:"
echo "=========================="

# Ищем процесс бота
BOT_PROCESS=$(ps aux | grep "tsx bot/index.ts" | grep -v grep)

if [ -n "$BOT_PROCESS" ]; then
    PID=$(echo "$BOT_PROCESS" | awk '{print $2}')
    echo "✅ Бот работает (PID: $PID)"
    echo "🕒 Время работы: $(ps -o etime= -p $PID)"
    
    # Показываем последние логи если есть
    if [ -f /tmp/telegram-bot.log ]; then
        echo "📋 Последние логи:"
        tail -n 5 /tmp/telegram-bot.log 2>/dev/null
    fi
else
    echo "❌ Бот не запущен"
    echo "🚀 Для запуска используйте: ./start-bot.sh"
fi

echo "=========================="