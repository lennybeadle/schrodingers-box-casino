'use client';

import { useEffect, useState } from 'react';

interface SpinnerProps {
  isSpinning: boolean;
  finalAngle: number;
  imageUrl: string;
  showLossImage?: boolean;
}

export function Spinner({ isSpinning, finalAngle, imageUrl, showLossImage = false }: SpinnerProps) {
  const [currentRotation, setCurrentRotation] = useState(320); // Start at 320 degrees offset

  useEffect(() => {
    if (isSpinning) {
      // Reset rotation when starting to spin (maintain 320 degree offset)
      setCurrentRotation(320);
    } else if (finalAngle !== undefined) {
      // When spin stops, rotate to final angle plus several full rotations
      // Add 3-5 full rotations (1080-1800 degrees) plus the final angle and 320 degree offset
      const fullRotations = 1440; // 4 full rotations
      setCurrentRotation(fullRotations + finalAngle + 320);
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
        
        {/* Revolver image with crossfade effect */}
        <div className="w-full h-full relative">
          {/* Normal revolver image - rotates with spinner */}
          <div
            className={`absolute inset-0 transition-transform duration-75 ease-linear ${
              isSpinning ? 'animate-spin-fast' : ''
            }`}
            style={{
              transform: !isSpinning && !showLossImage ? `rotate(${currentRotation}deg)` : showLossImage ? 'rotate(0deg)' : undefined,
              transitionDuration: !isSpinning && finalAngle !== undefined ? '3s' : showLossImage ? '700ms' : '75ms',
              transitionTimingFunction: !isSpinning && finalAngle !== undefined ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' : showLossImage ? 'ease-in-out' : 'linear'
            }}
          >
            <img 
              src={process.env.NEXT_PUBLIC_IMAGE_REVOLVER || "https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver.webp"}
              alt="Revolver cylinder" 
              className={`w-full h-full object-contain filter drop-shadow-2xl transition-opacity duration-700 ease-in-out ${
                showLossImage ? 'opacity-0' : 'opacity-100'
              }`}
              draggable={false}
            />
          </div>
          
          {/* Loss revolver image - stays at 0 degrees, no rotation */}
          <div className="absolute inset-0">
            <img 
              src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver_loss.webp"
              alt="Revolver cylinder loss" 
              className={`w-full h-full object-contain filter drop-shadow-2xl transition-all duration-700 ease-in-out ${
                showLossImage 
                  ? 'opacity-100 filter grayscale brightness-50 contrast-75 saturate-0' 
                  : 'opacity-0 filter brightness-100 saturate-100'
              }`}
              draggable={false}
            />
          </div>
        </div>

        {/* Zone indicator - Green alive zone or Red dead zone */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full transition-all duration-700 ease-in-out"
            style={{
              background: showLossImage 
                ? `conic-gradient(from 0deg, rgba(239, 68, 68, 0.4) 0deg, rgba(239, 68, 68, 0.4) 360deg)`
                : `conic-gradient(from 337.5deg, transparent 0deg, rgba(34, 197, 94, 0.3) 0deg, rgba(34, 197, 94, 0.3) 45deg, transparent 45deg)`,
              borderRadius: '50%',
              border: showLossImage 
                ? '2px solid rgba(239, 68, 68, 0.3)'
                : '2px solid rgba(34, 197, 94, 0.2)',
            }}
          >
            {/* Zone label */}
            <div className={`absolute top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full shadow-sm transition-all duration-700 ease-in-out ${
              showLossImage 
                ? 'text-red-600 bg-red-50/90 dark:bg-red-900/50'
                : 'text-green-600 bg-green-50/90 dark:bg-green-900/50'
            }`}>
              {showLossImage ? 'DEAD ZONE' : 'ALIVE ZONE'}
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