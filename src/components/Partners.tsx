import React from 'react';

const partners = [
  { name: 'BNB', symbol: 'BNB', iconColor: '#F3BA2F' },
  { name: 'DOGECOIN', symbol: 'DOGE', iconColor: '#C2A633' },
  { name: 'ethereum', symbol: 'ETH', iconColor: '#3C3C3D' },
  { name: 'LITECOIN', symbol: 'LTC', iconColor: '#345D9D' },
  { name: 'bitcoin', symbol: 'BTC', iconColor: '#F7931A' },
  { name: 'Perfect Money', symbol: 'PM', iconColor: '#E21A22' },
  { name: 'tether', symbol: 'USDT', iconColor: '#26A17B' },
  { name: 'TRON', symbol: 'TRX', iconColor: '#EC0623' },
  { name: 'XRP', symbol: 'XRP', iconColor: '#23292F' }
];

export default function Partners({ title }: { title?: string }) {
  return (
    <div className="w-full bg-slate-50 border-t border-b border-gray-100 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h3 className="text-center font-bold text-slate-800 text-lg md:text-xl font-display mb-8 uppercase tracking-wider">
            {title}
          </h3>
        )}
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-60 hover:opacity-85 transition-opacity duration-300">
          {partners.map((partner, index) => (
            <div 
              key={index} 
              className="flex items-center gap-1.5 filter grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer"
              title={partner.name}
            >
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm"
                style={{ backgroundColor: partner.iconColor || '#475569' }}
              >
                {partner.symbol.slice(0, 2)}
              </div>
              <span className="font-display font-medium text-slate-500 tracking-wider text-xs md:text-sm uppercase">
                {partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
