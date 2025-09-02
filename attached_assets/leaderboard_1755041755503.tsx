import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  level: number;
  avatar?: string;
  streak: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  className?: string;
}

export function Leaderboard({ entries, currentUserId, className = '' }: LeaderboardProps) {
  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-600 bg-yellow-50';
      case 2: return 'text-gray-600 bg-gray-50';
      case 3: return 'text-amber-700 bg-amber-50';
      default: return 'text-telegram-text bg-white';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {entries.map((entry, index) => {
        const position = index + 1;
        const isCurrentUser = entry.id === currentUserId;
        const medal = getMedalEmoji(position);
        
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
              isCurrentUser 
                ? 'border-student-blue bg-blue-50 shadow-md' 
                : 'border-gray-200 bg-white hover:shadow-sm'
            } ${getPositionColor(position)}`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8">
                {medal ? (
                  <span className="text-lg">{medal}</span>
                ) : (
                  <span className="font-bold text-sm">#{position}</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {entry.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {entry.name} {isCurrentUser && '(Вы)'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      Ур. {entry.level}
                    </Badge>
                    {entry.streak > 0 && (
                      <span className="text-xs text-orange-600">
                        🔥{entry.streak}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-bold text-lg">{entry.score.toLocaleString()}</p>
              <p className="text-xs text-telegram-secondary">очков</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}