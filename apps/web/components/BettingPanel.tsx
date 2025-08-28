'use client';

interface BettingPanelProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  multiplier: number;
  isPlaying: boolean;
  minBet?: number;
  gameName: string;
}

export function BettingPanel({
  betAmount,
  setBetAmount,
  multiplier,
  isPlaying,
  minBet = 0.001,
  gameName,
}: BettingPanelProps) {
  const chips = ['0.001', '0.01', '0.05', '0.1'];

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-8 border border-gray-100 shadow-sm space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-light text-gray-900">{gameName}</h3>
        
        {/* Chip Selection */}
        <div className="flex gap-2 justify-center">
          {chips.map((amount) => (
            <button
              key={amount}
              onClick={() => setBetAmount(amount)}
              disabled={isPlaying}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-mono ${
                betAmount === amount
                  ? 'bg-gradient-to-r from-czar-gold to-caesar-bronze text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {amount} SUI
            </button>
          ))}
        </div>

        {/* Custom Amount Input */}
        <div className="relative">
          <input 
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            step="0.001"
            min={minBet}
            disabled={isPlaying}
            className="w-full text-3xl font-light text-center py-4 bg-transparent border-0 border-b-2 border-gray-200 focus:border-czar-gold focus:outline-none focus:ring-0 transition-colors duration-500 font-mono"
            placeholder="0.00"
          />
          <span className="absolute right-0 bottom-4 text-xl font-light text-gray-400">SUI</span>
        </div>

        {/* Potential Win Display */}
        <div className="text-center py-4 border-t border-gray-100">
          <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">
            Potential Win
          </div>
          <div className="text-3xl font-light text-czar-gold font-mono">
            {(parseFloat(betAmount || '0') * multiplier).toFixed(3)} SUI
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {multiplier}x multiplier
          </div>
        </div>
      </div>
    </div>
  );
}