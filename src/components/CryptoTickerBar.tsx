import React from 'react';

interface TickerItem {
  id: string;
  type: 'crypto' | 'metric';
  symbol?: string;
  price?: string;
  priceColor?: string;
  label?: string;
  value?: string;
  change?: string;
  isPositive?: boolean | null; // true: green, false: red, null: neutral
  icon?: React.ReactNode;
}

const TICKER_DATA: TickerItem[] = [
  {
    id: 'btc',
    type: 'crypto',
    symbol: 'BTC',
    price: '$77,937.00',
    priceColor: 'text-[#F7931A]', // Orange
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#F7931A">
        <circle cx="12" cy="12" r="12" fill="#F7931A" />
        <path
          fill="#FFF"
          d="M16.4 10.4c.2-1.3-.8-2-2.2-2.5l.4-1.8-1.1-.3-.4 1.7c-.3-.1-.6-.2-.9-.2l.4-1.7-1.1-.3-.5 1.8c-.3-.1-.5-.1-.8-.2l-1.5-.4-.3 1.2s.8.2.8.2c.4.1.5.4.5.6l-.5 2.1c0 0 .1 0 .1 0l-.1 0-.7 2.9c0 .2-.1.5-.5.4 0 0-.8-.2-.8-.2l-.6 1.3 1.4.4c.3.1.5.1.8.2l-.4 1.8 1.1.3.4-1.8c.3.1.6.2.9.2l-.4 1.7 1.1.3.4-1.8c1.9.4 3.3.2 3.9-1.5.5-1.4 0-2.2-1-2.7.7-.4 1.2-1 1-2.2zm-2.4 4.3c-.3 1.4-2.5.6-3.2.4l.6-2.3c.7.2 2.9.5 2.6 1.9zm.4-4.4c-.3 1.2-2.1.6-2.7.4l.5-2.1c.6.2 2.5.5 2.2 1.7z"
        />
      </svg>
    ),
  },
  {
    id: 'eth',
    type: 'crypto',
    symbol: 'ETH',
    price: '$2,499.92',
    priceColor: 'text-[#4A90E2]', // Blue
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#1C2D48" />
        <path d="M12 3.5L6.5 12.6L12 15.9L17.5 12.6L12 3.5Z" fill="#627EEA" />
        <path d="M12 15.9L6.5 12.6L12 20.5L17.5 12.6L12 15.9Z" fill="#627EEA" opacity="0.8" />
        <path d="M12 3.5L12 15.9L17.5 12.6L12 3.5Z" fill="#8A92B2" />
        <path d="M12 15.9L12 20.5L17.5 12.6L12 15.9Z" fill="#8A92B2" />
      </svg>
    ),
  },
  {
    id: 'bnb',
    type: 'crypto',
    symbol: 'BNB',
    price: '$744.53',
    priceColor: 'text-[#F3BA2F]', // Yellow
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#F3BA2F">
        <circle cx="12" cy="12" r="12" fill="#F3BA2F" />
        <path
          fill="#1E2026"
          d="M12 6.8l2.6 2.6-2.6 2.6-2.6-2.6L12 6.8zm4.6 4.6l2.6-2.6.9.9-2.6 2.6-2.5-2.6zm-9.2 0l2.6-2.6L12 11.4l-2.6 2.6-2-2.6zm4.6 4.6l2.6 2.6-2.6 2.6-2.6-2.6 2.6-2.6zm0-3.6l1.9 1.9-1.9 1.9-1.9-1.9 1.9-1.9z"
        />
      </svg>
    ),
  },
  {
    id: 'sol',
    type: 'crypto',
    symbol: 'SOL',
    price: '$105.47',
    priceColor: 'text-[#00FFA3]', // Neon Green / Cyan
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#0A1628" />
        <path d="M6 15.5h9.5l2.5-2.5H8.5L6 15.5zm2.5-4.5h9.5L15.5 8.5H6l2.5 2.5zm9.5-4.5H8.5L6 9h9.5l2.5-2.5z" fill="#00FFA3" />
      </svg>
    ),
  },
  {
    id: 'ton',
    type: 'crypto',
    symbol: 'TON',
    price: '$90.36',
    priceColor: 'text-[#2DD4BF]', // Teal
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#2DD4BF" />
        <path
          d="M12 6.5L7 10.2L12 17.5L17 10.2L12 6.5ZM12 8.4L15.3 10.8L12 15.4L8.7 10.8L12 8.4Z"
          fill="#0B2545"
        />
      </svg>
    ),
  },
  {
    id: 'market_overview',
    type: 'metric',
    value: '$307.48B',
    change: '0%',
    isPositive: null,
  },
  {
    id: 'dat_flows',
    type: 'metric',
    label: '7d DAT Flows',
    value: '$323.14M',
    change: '-0.65%',
    isPositive: false,
  },
  {
    id: 'etf_flows',
    type: 'metric',
    label: '5d ETF Flows',
    value: '-$339.9M',
    change: '-0.05%',
    isPositive: false,
  },
  {
    id: 'dex_vol',
    type: 'metric',
    label: '24hr Spot DEX Volume',
    value: '$6.03B',
    change: '-0.75%',
    isPositive: false,
  },
  {
    id: 'app_rev',
    type: 'metric',
    label: '24hr App Revenue',
    value: '$12.8M',
    change: '+1.42%',
    isPositive: true,
  },
  {
    id: 'total_cap',
    type: 'metric',
    label: 'Market Cap',
    value: '$2.78T',
    change: '+2.18%',
    isPositive: true,
  },
];

export default function CryptoTickerBar() {
  const renderItem = (item: TickerItem, keySuffix: string) => {
    if (item.type === 'crypto') {
      return (
        <div
          key={`${item.id}-${keySuffix}`}
          className="inline-flex items-center gap-2 whitespace-nowrap px-3 text-xs"
        >
          {item.icon}
          <span className={`font-bold tracking-wide ${item.priceColor || 'text-white'}`}>
            {item.price}
          </span>
        </div>
      );
    }

    return (
      <div
        key={`${item.id}-${keySuffix}`}
        className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 text-xs"
      >
        {item.label && <span className="text-slate-300 font-medium">{item.label}</span>}
        <span className="text-white font-bold">{item.value}</span>
        {item.change && (
          <span
            className={`font-semibold text-[11px] ${
              item.isPositive === true
                ? 'text-emerald-400'
                : item.isPositive === false
                ? 'text-rose-500'
                : 'text-slate-300'
            }`}
          >
            {item.change}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className="w-full bg-[#07172A] border-y border-[#122744] text-white py-2 overflow-hidden relative select-none z-30"
      style={{ backgroundColor: '#07172A' }}
    >
      {/* Subtle edge fades for sleek continuous presentation */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#07172A] to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#07172A] to-transparent pointer-events-none z-10" />

      {/* Marquee Moving Always Steady from Right to Left */}
      <div className="flex w-max items-center animate-ticker-steady">
        {/* Set 1 */}
        <div className="flex items-center divide-x divide-white/10 shrink-0">
          {TICKER_DATA.map((item) => renderItem(item, 'a'))}
        </div>
        
        {/* Set 2 (Duplicated for seamless continuous loop) */}
        <div className="flex items-center divide-x divide-white/10 shrink-0" aria-hidden="true">
          {TICKER_DATA.map((item) => renderItem(item, 'b'))}
        </div>

        {/* Set 3 (Buffer to ensure no gap on ultra-wide screens) */}
        <div className="flex items-center divide-x divide-white/10 shrink-0" aria-hidden="true">
          {TICKER_DATA.map((item) => renderItem(item, 'c'))}
        </div>
      </div>
    </div>
  );
}
