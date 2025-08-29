'use client';

interface BettingPanelProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  multiplier: number;
  isPlaying: boolean;
  minBet?: number;
  gameName: string;
  targetMultiplier?: number;
  setTargetMultiplier?: (target: number) => void;
  showTargetMultiplier?: boolean;
}

export function BettingPanel({
  betAmount,
  setBetAmount,
  multiplier,
  isPlaying,
  minBet = 0.1,
  gameName,
  targetMultiplier,
  setTargetMultiplier,
  showTargetMultiplier = false,
}: BettingPanelProps) {
  const chips = ['0.1', '0.5', '1.0', '5.0'];
  const targetMultipliers = [120, 200, 300, 500]; // 1.2x, 2.0x, 3.0x, 5.0x

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 transition-colors duration-300">
      <div className="space-y-3">
        <h3 className="text-lg font-light text-gray-900 dark:text-gray-100 text-center">{gameName}</h3>
        
        {/* Bet Amount Selection */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
            Bet Amount (SUI)
          </div>
          <div className="grid grid-cols-4 gap-2">
            {chips.map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                disabled={isPlaying}
                className={`px-2 py-1.5 rounded-md transition-all text-xs font-mono ${
                  betAmount === amount
                    ? 'bg-gradient-to-r from-red-600 to-red-700 dark:from-red-500 dark:to-red-600 text-white shadow-md ring-1 ring-red-400/50'
                    : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm'
                } disabled:opacity-50`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        {/* Target Multiplier Selection - Only for crash game */}
        {showTargetMultiplier && targetMultiplier && setTargetMultiplier && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
              Target Multiplier
            </div>
            <div className="grid grid-cols-4 gap-2">
              {targetMultipliers.map((target) => (
                <button
                  key={target}
                  onClick={() => setTargetMultiplier(target)}
                  disabled={isPlaying}
                  className={`px-2 py-1.5 rounded-md transition-all text-xs font-mono ${
                    targetMultiplier === target
                      ? 'bg-gradient-to-r from-red-600 to-red-700 dark:from-red-500 dark:to-red-600 text-white shadow-md ring-1 ring-red-400/50'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm'
                  } disabled:opacity-50`}
                >
                  {(target / 100).toFixed(1)}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Amount Input - Smaller */}
        <div className="relative">
          <input 
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            step="0.1"
            min={minBet}
            disabled={isPlaying}
            className="w-full text-xl font-light text-center py-2 bg-transparent border-0 border-b border-gray-200 dark:border-gray-600 focus:border-czar-gold dark:focus:border-yellow-400 focus:outline-none focus:ring-0 transition-colors duration-300 font-mono text-gray-900 dark:text-gray-100"
            placeholder="0.00"
          />
          <span className="absolute right-0 bottom-2 text-sm font-light text-gray-400 dark:text-gray-500">SUI</span>
        </div>

        {/* Potential Win Display - Compact */}
        <div className="text-center py-2 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            Potential Win
          </div>
          <div className="text-xl font-light text-czar-gold dark:text-yellow-400 font-mono">
            {(parseFloat(betAmount || '0') * multiplier).toFixed(3)}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {multiplier.toFixed(2)}x
          </div>
        </div>
      </div>
    </div>
  );
}