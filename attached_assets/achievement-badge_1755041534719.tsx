import { motion } from 'framer-motion';

interface AchievementBadgeProps {
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  className?: string;
  onClick?: () => void;
}

export function AchievementBadge({ 
  title, 
  description, 
  icon, 
  unlocked, 
  rarity,
  className = '',
  onClick 
}: AchievementBadgeProps) {
  const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-yellow-600'
  };

  const rarityGlow = {
    common: 'shadow-gray-400/20',
    rare: 'shadow-blue-400/30',
    epic: 'shadow-purple-400/30',
    legendary: 'shadow-yellow-400/40'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: unlocked ? 1.05 : 1 }}
      whileTap={{ scale: unlocked ? 0.95 : 1 }}
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
        unlocked 
          ? `bg-gradient-to-br ${rarityColors[rarity]} border-white/20 shadow-lg ${rarityGlow[rarity]}` 
          : 'bg-gray-100 border-gray-300 opacity-50'
      } ${className}`}
    >
      {/* Sparkle animation for unlocked achievements */}
      {unlocked && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <div className="absolute top-2 right-2 text-white text-xs">✨</div>
          <div className="absolute bottom-2 left-2 text-white text-xs">⭐</div>
        </motion.div>
      )}
      
      <div className="text-center">
        <div className={`text-3xl mb-2 ${unlocked ? '' : 'grayscale'}`}>
          {icon}
        </div>
        <h4 className={`font-bold text-sm mb-1 ${unlocked ? 'text-white' : 'text-gray-600'}`}>
          {title}
        </h4>
        <p className={`text-xs ${unlocked ? 'text-white/80' : 'text-gray-500'}`}>
          {description}
        </p>
      </div>
      
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
      )}
    </motion.div>
  );
}