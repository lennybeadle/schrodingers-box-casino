'use client';

import { useEffect, useState } from 'react';

interface MotorcycleProps {
  isAnimating: boolean;
  crashed: boolean;
  crashMultiplier: number;
}

export function Motorcycle({ isAnimating, crashed, crashMultiplier }: MotorcycleProps) {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'jittering' | 'exploded' | 'celebrating'>('idle');
  const [showExplosion, setShowExplosion] = useState(false);

  useEffect(() => {
    if (isAnimating) {
      setAnimationPhase('jittering');
      setShowExplosion(false);
      
      // After 2.5 seconds, determine outcome
      const timer = setTimeout(() => {
        if (crashed) {
          setAnimationPhase('exploded');
          setShowExplosion(true);
          // Hide explosion after 1 second
          setTimeout(() => setShowExplosion(false), 1000);
        } else {
          setAnimationPhase('celebrating');
        }
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      setAnimationPhase('idle');
      setShowExplosion(false);
    }
  }, [isAnimating, crashed]);

  return (
    <div className="relative flex items-center justify-center w-full h-64">
      {/* Motorcycle Image */}
      <div className={`relative transition-all duration-500 ${
        animationPhase === 'jittering' 
          ? 'animate-pulse' 
          : animationPhase === 'celebrating'
          ? 'animate-bounce'
          : animationPhase === 'exploded'
          ? 'opacity-30 scale-90'
          : ''
      }`}>
        <img
          src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/motorcycle.webp"
          alt="Crash Motorcycle"
          className={`w-48 h-48 object-contain ${
            animationPhase === 'jittering' ? 'jitter-animation' : ''
          }`}
        />
      </div>

      {/* Explosion Effect */}
      {showExplosion && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="explosion-burst">
            💥
          </div>
        </div>
      )}

      {/* Status Messages */}
      {!isAnimating && animationPhase === 'exploded' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">
            💥 CRASHED at {crashMultiplier / 100}×
          </div>
        </div>
      )}

      {!isAnimating && animationPhase === 'celebrating' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold">
            🎉 CASHED OUT at {crashMultiplier / 100}×
          </div>
        </div>
      )}

      {/* Racing stripes effect during animation */}
      {animationPhase === 'jittering' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="racing-lines"></div>
        </div>
      )}

      <style jsx>{`
        .jitter-animation {
          animation: jitter 0.1s infinite;
        }
        
        @keyframes jitter {
          0%, 100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
          10% { transform: translateX(-2px) translateY(-1px) rotate(-0.5deg); }
          20% { transform: translateX(2px) translateY(1px) rotate(0.5deg); }
          30% { transform: translateX(-1px) translateY(2px) rotate(-0.3deg); }
          40% { transform: translateX(1px) translateY(-2px) rotate(0.3deg); }
          50% { transform: translateX(-2px) translateY(1px) rotate(-0.4deg); }
          60% { transform: translateX(2px) translateY(-1px) rotate(0.4deg); }
          70% { transform: translateX(-1px) translateY(-2px) rotate(-0.2deg); }
          80% { transform: translateX(1px) translateY(2px) rotate(0.2deg); }
          90% { transform: translateX(-2px) translateY(-1px) rotate(-0.1deg); }
        }

        .explosion-burst {
          font-size: 6rem;
          animation: explode 0.5s ease-out;
        }

        @keyframes explode {
          0% { 
            transform: scale(0.5); 
            opacity: 0;
          }
          50% { 
            transform: scale(1.5); 
            opacity: 1;
          }
          100% { 
            transform: scale(2); 
            opacity: 0;
          }
        }

        .racing-lines {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 25%,
            rgba(255, 255, 255, 0.6) 50%,
            rgba(255, 255, 255, 0.3) 75%,
            transparent 100%
          );
          width: 200%;
          height: 100%;
          animation: race 0.3s infinite linear;
        }

        @keyframes race {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </div>
  );
}