import { motion } from 'framer-motion';

interface StreakBadgeProps {
  days: number;
  className?: string;
}

export function StreakBadge({ days, className = '' }: StreakBadgeProps) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", delay: 0.2 }}
      className={`inline-flex items-center space-x-2 bg-gradient-to-r from-orange-400 to-red-500 text-white px-3 py-1 rounded-full text-sm font-bold ${className}`}
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
      >
        🔥
      </motion.div>
      <span>{days} дней</span>
    </motion.div>
  );
}