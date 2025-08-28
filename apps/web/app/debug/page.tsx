'use client';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Contract Addresses</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Environment Variables</h2>
          
          <div className="grid grid-cols-1 gap-4 font-mono text-sm">
            <div className="bg-gray-50 p-4 rounded">
              <strong>Network:</strong><br/>
              <code>{process.env.NEXT_PUBLIC_SUI_NETWORK}</code>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <strong>Package ID:</strong><br/>
              <code>{process.env.NEXT_PUBLIC_PACKAGE_ID}</code>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <strong>House Object ID:</strong><br/>
              <code>{process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID}</code>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold text-blue-800">Expected Values (NEW Contract):</h3>
            <div className="text-sm font-mono mt-2 text-blue-700">
              <div>Package: 0x81e3ec93b4682c94fb57dede2507d7384ef19805d98557669aca15f7320c771b</div>
              <div>House: 0xf9af5e31d72db67489d60e2d68f51c2ad915d4cad25f4d6acae4c51ed83b0ce3</div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-red-50 rounded">
            <h3 className="font-semibold text-red-800">Old Values (should NOT be these):</h3>
            <div className="text-sm font-mono mt-2 text-red-700">
              <div>Package: 0xf053ee91251bfccab11f05ba48831ada4996cb4960c448fa35c7d83ce0ef4bbb</div>
              <div>House: 0x21a8335e248f9e7d1bba2ceecb20bbb85ca45fd8bd45227d9dd5e09a39c01735</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}