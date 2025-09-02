import { motion } from 'framer-motion';

interface ExperienceBarProps {
  currentXP: number;
  nextLevelXP: number;
  level: number;
  className?: string;
}

export function ExperienceBar({ currentXP, nextLevelXP, level, className = '' }: ExperienceBarProps) {
  const progress = (currentXP / nextLevelXP) * 100;
  const remainingXP = nextLevelXP - currentXP;

  return (
    <div className={`bg-white rounded-lg p-4 border shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {level}
          </div>
          <span className="font-semibold text-telegram-text">Уровень {level}</span>
        </div>
        <span className="text-sm text-telegram-secondary">
          {currentXP} / {nextLevelXP} XP
        </span>
      </div>
      
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-purple-500 to-blue-600 rounded-full"
        />
        
        {/* Sparkle effect */}
        <motion.div
          animate={{ x: [-10, 300] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 h-full w-4 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          style={{ transform: 'skewX(-20deg)' }}
        />
      </div>
      
      <p className="text-xs text-telegram-secondary mt-1">
        {remainingXP} XP до следующего уровня
      </p>
    </div>
  );
}