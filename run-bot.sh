#!/bin/bash

# АТТЕСТАТ БЕЗ РЕМНЯ Telegram Bot Runner
# This script starts the Telegram bot for the educational platform

echo "🤖 Запуск Telegram бота для платформы изучения русского языка..."

# Check if token is available (from environment or .env file)
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    # Try to load from .env file if exists
    if [ -f .env ]; then
        echo "🔍 Загружаем переменные из .env файла..."
        source .env
    fi
    
    # Check again after sourcing .env
    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        echo "❌ TELEGRAM_BOT_TOKEN не найден ни в переменных окружения, ни в .env файле"
        if [ ! -f .env ]; then
            echo "⚠️  Создается файл .env из примера..."
            cp .env.example .env
            echo "📝 Отредактируйте файл .env и добавьте ваш TELEGRAM_BOT_TOKEN от @BotFather"
        fi
        exit 1
    fi
else
    echo "✅ Токен бота найден в переменных окружения"
fi

# Start the bot
echo "🚀 Запуск бота..."
tsx bot/index.ts