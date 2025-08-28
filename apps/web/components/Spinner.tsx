'use client';

import { useEffect, useState } from 'react';

interface SpinnerProps {
  isSpinning: boolean;
  finalAngle: number;
  imageUrl: string;
}

export function Spinner({ isSpinning, finalAngle, imageUrl }: SpinnerProps) {
  const [currentRotation, setCurrentRotation] = useState(0);

  useEffect(() => {
    if (isSpinning) {
      // Reset rotation when starting to spin
      setCurrentRotation(0);
    } else if (finalAngle !== undefined) {
      // When spin stops, rotate to final angle plus several full rotations
      // Add 3-5 full rotations (1080-1800 degrees) plus the final angle
      const fullRotations = 1440; // 4 full rotations
      setCurrentRotation(fullRotations + finalAngle);
    }
  }, [isSpinning, finalAngle]);

  return (
    <div className="relative w-72 h-72 mx-auto">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 rounded-full blur-xl"></div>
      
      {/* Spinner container */}
      <div className="relative w-full h-full">
        {/* Tick mark at 0 degrees (top) */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-20">
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-red-600">
            <path 
              d="M12 2 L8 8 L16 8 Z" 
              fill="currentColor"
              stroke="white"
              strokeWidth="1"
            />
          </svg>
        </div>
        
        {/* Revolver image */}
        <div 
          className={`w-full h-full transition-transform duration-75 ease-linear ${
            isSpinning ? 'animate-spin-fast' : ''
          }`}
          style={{
            transform: !isSpinning ? `rotate(${currentRotation}deg)` : undefined,
            transitionDuration: !isSpinning && finalAngle !== undefined ? '3s' : '75ms',
            transitionTimingFunction: !isSpinning && finalAngle !== undefined ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'linear'
          }}
        >
          <img 
            src={imageUrl}
            alt="Revolver cylinder" 
            className="w-full h-full object-contain filter drop-shadow-2xl"
            draggable={false}
          />
        </div>

        {/* Win zone indicator (0-45 degrees) */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full"
            style={{
              background: `conic-gradient(from 0deg, rgba(34, 197, 94, 0.1) 0deg, rgba(34, 197, 94, 0.1) 45deg, transparent 45deg, transparent 360deg)`,
              borderRadius: '50%',
            }}
          >
            {/* Win zone label */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-xs font-mono text-green-600 bg-white/80 px-2 py-1 rounded">
              ALIVE
            </div>
          </div>
        </div>
      </div>

      {/* Angle display */}
      {!isSpinning && finalAngle !== undefined && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-mono text-gray-600 bg-white/90 px-3 py-1 rounded-full">
          {finalAngle}°
        </div>
      )}
    </div>
  );
}