'use client';

import { motion } from 'framer-motion';

interface CatAnimationProps {
  isWinner?: boolean;
  isAnimating?: boolean;
}

export function CatAnimation({ isWinner, isAnimating }: CatAnimationProps) {
  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-caesar-gold/10 via-caesar-cream/5 to-czar-bronze/10 rounded-full blur-2xl animate-pulse"></div>
      
      {/* Main Caesar portrait */}
      <motion.div
        animate={isAnimating ? { rotate: [0, 360], scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, ease: 'easeInOut' }}
        className="relative z-10"
      >
        <img 
          src="/logo.svg" 
          alt="Caesar the Cat" 
          className={`w-48 h-48 mx-auto filter drop-shadow-xl transition-all duration-1000 ${
            isWinner !== undefined 
              ? isWinner 
                ? 'filter brightness-110 saturate-150' 
                : 'filter grayscale brightness-75'
              : 'animate-caesar-float'
          }`}
        />
      </motion.div>
      
      {/* Result overlay effects */}
      {isWinner !== undefined && (
        <>
          {isWinner ? (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 2, duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span className="text-4xl">👑</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -30, opacity: 0 }}
              transition={{ delay: 2, duration: 1.5 }}
              className="absolute top-0 left-1/2 transform -translate-x-1/2 pointer-events-none"
            >
              <span className="text-3xl">⚱️</span>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}