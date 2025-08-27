'use client';

export function WalletInstallLinks() {
  const wallets = [
    {
      name: 'Sui Wallet',
      icon: '🌊',
      description: 'Official Sui wallet - recommended',
      chromeUrl: 'https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
      firefoxUrl: 'https://addons.mozilla.org/en-US/firefox/addon/sui-wallet/',
      website: 'https://sui.io/wallet'
    },
    {
      name: 'Suiet',
      icon: '💎', 
      description: 'Multi-chain wallet with great Sui support',
      chromeUrl: 'https://chrome.google.com/webstore/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd',
      website: 'https://suiet.app/'
    },
    {
      name: 'Phantom',
      icon: '👻',
      description: 'Popular wallet now supporting Sui',
      chromeUrl: 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
      website: 'https://phantom.app/'
    },
    {
      name: 'OKX Wallet', 
      icon: '⭕',
      description: 'Global exchange wallet',
      chromeUrl: 'https://chrome.google.com/webstore/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge',
      website: 'https://www.okx.com/web3'
    }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          🚀 Get a Sui Wallet
        </h3>
        <p className="text-sm text-gray-600">
          Install any of these wallets to start playing CATSINO
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {wallets.map((wallet) => (
          <div
            key={wallet.name}
            className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-lg p-4 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl mt-1">{wallet.icon}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{wallet.name}</h4>
                <p className="text-xs text-gray-500 mb-3">{wallet.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {wallet.chromeUrl && (
                    <a
                      href={wallet.chromeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs rounded-full transition-colors"
                    >
                      Chrome
                    </a>
                  )}
                  {wallet.firefoxUrl && (
                    <a
                      href={wallet.firefoxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs rounded-full transition-colors"
                    >
                      Firefox
                    </a>
                  )}
                  <a
                    href={wallet.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-full transition-colors"
                  >
                    Website
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-6">
        <p className="text-xs text-gray-500">
          💡 After installing, refresh this page and connect your wallet
        </p>
      </div>
    </div>
  );
}