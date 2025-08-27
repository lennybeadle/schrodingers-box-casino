'use client';

import { motion } from 'framer-motion';

export function CatSVG() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto drop-shadow-lg"
    >
      <defs>
        <linearGradient id="catGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <g id="cat" filter="url(#glow)">
        {/* Outer glow circle */}
        <circle cx="100" cy="100" r="65" fill="url(#catGradient)" opacity="0.1" />
        
        {/* Cat body */}
        <ellipse cx="100" cy="110" rx="42" ry="37" fill="url(#catGradient)" opacity="0.9" />
        
        {/* Cat ears */}
        <polygon points="68,83 58,55 78,68" fill="url(#catGradient)" />
        <polygon points="132,83 142,55 122,68" fill="url(#catGradient)" />
        
        {/* Inner ear */}
        <polygon points="70,78 65,65 75,72" fill="#ffffff" opacity="0.8" />
        <polygon points="130,78 135,65 125,72" fill="#ffffff" opacity="0.8" />
        
        {/* Eyes */}
        <circle cx="85" cy="100" r="4" fill="#1e293b" />
        <circle cx="115" cy="100" r="4" fill="#1e293b" />
        <circle cx="86" cy="99" r="1.5" fill="#ffffff" />
        <circle cx="116" cy="99" r="1.5" fill="#ffffff" />
        
        {/* Nose */}
        <path d="M95 110 L100 115 L105 110 Z" fill="#ec4899" />
        
        {/* Mouth */}
        <path d="M90 118 Q100 125 110 118" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        
        {/* Whiskers */}
        <line x1="58" y1="105" x2="38" y2="100" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <line x1="58" y1="115" x2="38" y2="115" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <line x1="58" y1="125" x2="38" y2="130" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        
        <line x1="142" y1="105" x2="162" y2="100" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <line x1="142" y1="115" x2="162" y2="115" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <line x1="142" y1="125" x2="162" y2="130" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

interface CatAnimationProps {
  isWinner?: boolean;
  isAnimating?: boolean;
}

export function CatAnimation({ isWinner, isAnimating }: CatAnimationProps) {
  return (
    <div className="relative w-64 h-64 mx-auto">
      <motion.div
        animate={isAnimating ? { rotate: [0, 360] } : {}}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <CatSVG />
      </motion.div>
      
      {isWinner !== undefined && (
        <>
          {isWinner ? (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-6xl animate-confetti">✨</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -100, opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute top-0 left-1/2 transform -translate-x-1/2"
            >
              <span className="text-3xl">😇</span>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}