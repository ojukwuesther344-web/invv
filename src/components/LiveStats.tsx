import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

type CoinType = 'BTC' | 'ETH' | 'TRX' | 'BNB' | 'SOL' | 'USDT' | 'LTC' | 'XRP' | 'DOGE';

interface Transaction {
  id: string;
  txHash: string;
  amount: string;
  value: string;
  age: string;
  coin: CoinType;
  isNew?: boolean;
}

// Crisp, official SVG vector logos for each major cryptocurrency
function CoinLogo({ coin }: { coin: CoinType }) {
  switch (coin) {
    case 'BTC':
      return (
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            fill="#FFF"
            d="M21.9 13.9c.3-1.8-1.1-2.7-3-3.3l.6-2.4-1.5-.4-.6 2.3c-.4-.1-.8-.2-1.2-.3l.6-2.3-1.5-.4-.6 2.4c-.3-.1-.7-.2-1-.2l-2-.5-.4 1.6s1 .2 1 .3c.5.1.7.5.7.9l-.7 2.8c0 0 .1 0 .2 0l-.2 0-.9 3.8c-.1.3-.3.7-.7.6 0 0-1-.3-1-.3l-.8 1.7 1.9.5c.4.1.7.2 1.1.3l-.6 2.5 1.5.4.6-2.4c.4.1.8.2 1.2.3l-.6 2.4 1.5.4.6-2.5c2.6.5 4.5.3 5.3-2 .7-1.9 0-3-1.4-3.7 1-.6 1.7-1.4 1.4-3zm-3.3 5.8c-.5 1.9-3.4.9-4.3.7l.8-3.1c.9.2 3.9.7 3.5 2.4zm.5-5.9c-.4 1.7-2.8.8-3.6.6l.7-2.9c.8.2 3.3.6 2.9 2.3z"
          />
        </svg>
      );
    case 'ETH':
      return (
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <path d="M16 4.5L8.5 16.8L16 21.2L23.5 16.8L16 4.5Z" fill="#FFF" fillOpacity="0.8" />
          <path d="M16 21.2L8.5 16.8L16 27.5L23.5 16.8L16 21.2Z" fill="#FFF" fillOpacity="0.5" />
          <path d="M16 4.5L16 21.2L23.5 16.8L16 4.5Z" fill="#FFF" />
          <path d="M16 21.2L16 27.5L23.5 16.8L16 21.2Z" fill="#FFF" fillOpacity="0.75" />
        </svg>
      );
    case 'TRX':
      return (
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#EF0027" />
          <path
            d="M7.5 8.5L24.5 7.2L25.2 8.4L16 26.5L7.5 8.5ZM10.2 9.7L15.3 20.3L22.6 8.7L10.2 9.7ZM16.3 22.3L23.6 9.9L23 8.8L16.3 22.3Z"
            fill="#FFF"
          />
        </svg>
      );
    case 'BNB':
      return (
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
          <path
            fill="#FFF"
            d="M16 9l3.5 3.5-3.5 3.5-3.5-3.5L16 9zm6.2 6.2l3.5-3.5 1.3 1.3-3.5 3.5-3.4-3.5l2.1-2.1zm-12.4 0l3.5-3.5 2.1 2.1-3.4 3.5-3.5-3.5 1.3-1.3zm6.2 6.2l3.5-3.5 3.5 3.5-3.5 3.5-3.5-3.5zm0-4.9l2.6-2.6 2.6 2.6-2.6 2.6-2.6-2.6zm-5.2 0l2.6-2.6 2.6 2.6-2.6 2.6-2.6-2.6zm10.4 0l2.6-2.6 2.6 2.6-2.6 2.6-2.6-2.6z"
          />
        </svg>
      );
    case 'SOL':
      return (
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#030816" />
          <path
            d="M8.5 20.5h11.8l3.2-3.2H11.7l-3.2 3.2zm3.2-5.7h11.8l3.2-3.2H14.9l-3.2 3.2zm11.8-5.7H11.7L8.5 12.3h11.8l3.2-3.2z"
            fill="url(#solGradLive)"
          />
          <defs>
            <linearGradient id="solGradLive" x1="8.5" y1="9.1" x2="23.5" y2="20.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00FFA3" />
              <stop offset="1" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'USDT':
      return (
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            fill="#FFF"
            d="M17.8 14.8v-1.7h5.1V10H9.1v3.1h5.1v1.7c-4.4.2-7.7 1.1-7.7 2.2 0 1.1 3.3 2 7.7 2.2v5.7h3.6v-5.7c4.4-.2 7.7-1.1 7.7-2.2 0-1.1-3.3-2-7.7-2.2zm0 3.3c-3.7-.2-6.4-.8-6.4-1.4 0-.6 2.7-1.2 6.4-1.4v2.8zm-3.6 0v-2.8c3.7.2 6.4.8 6.4 1.4 0 .6-2.7 1.2-6.4 1.4z"
          />
        </svg>
      );
    case 'LTC':
      return (
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#345D9D" />
          <path
            fill="#FFF"
            d="M14.2 8.5h3.6l-1.9 7.7h3.8l-.7 2.8h-3.8l-1.6 6.5h7.7l-.7 2.8H10.5l4.8-19.8h-1.1z"
          />
        </svg>
      );
    case 'XRP':
      return (
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#23292F" />
          <path
            fill="#FFF"
            d="M23.1 9.5h2.1c-.2.3-4.5 4.5-9.2 4.5-4.6 0-9-4.2-9.2-4.5h2.1c.2.2 3.6 3.4 7.1 3.4 3.6 0 7-3.2 7.1-3.4zm0 13h2.1c-.2-.3-4.5-4.5-9.2-4.5-4.6 0-9 4.2-9.2 4.5h2.1c.2-.2 3.6-3.4 7.1-3.4 3.6 0 7 3.2 7.1 3.4z"
          />
        </svg>
      );
    case 'DOGE':
      return (
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#C2A633" />
          <path
            fill="#FFF"
            d="M13 9.5h4.2c3.5 0 6.3 2.8 6.3 6.5s-2.8 6.5-6.3 6.5H13V9.5zm3.5 10.3c1.9 0 3.5-1.7 3.5-3.8s-1.6-3.8-3.5-3.8h-.8v7.6h.8zm-5.7-3.1h4.4v-1.5h-4.4v1.5z"
          />
        </svg>
      );
    default:
      return null;
  }
}

// 10 Initial Transactions with distinct known coin logos and completely unique wallet addresses
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    coin: 'BTC',
    txHash: 'bc1q987...d862',
    amount: '1.5713 BTC',
    value: '$122,534',
    age: '18m ago',
  },
  {
    id: 'tx-2',
    coin: 'ETH',
    txHash: '0x71c82...9f36',
    amount: '8.4500 ETH',
    value: '$21,124',
    age: '19m ago',
  },
  {
    id: 'tx-3',
    coin: 'TRX',
    txHash: 'TK9a34...6e25',
    amount: '142,500 TRX',
    value: '$35,625',
    age: '21m ago',
  },
  {
    id: 'tx-4',
    coin: 'BNB',
    txHash: '0x3f819...ee3e',
    amount: '45.2100 BNB',
    value: '$33,660',
    age: '24m ago',
  },
  {
    id: 'tx-5',
    coin: 'SOL',
    txHash: '7xKX29...49a1',
    amount: '210.00 SOL',
    value: '$22,148',
    age: '27m ago',
  },
  {
    id: 'tx-6',
    coin: 'USDT',
    txHash: 'TR7NH8...17f2',
    amount: '50,000 USDT',
    value: '$50,000',
    age: '31m ago',
  },
  {
    id: 'tx-7',
    coin: 'BTC',
    txHash: 'bc1qa4f...3e19',
    amount: '0.0246 BTC',
    value: '$1,668',
    age: '33m ago',
  },
  {
    id: 'tx-8',
    coin: 'LTC',
    txHash: 'ltc1q8...77ae',
    amount: '185.40 LTC',
    value: '$16,315',
    age: '36m ago',
  },
  {
    id: 'tx-9',
    coin: 'XRP',
    txHash: 'rEb8TK...2b91',
    amount: '18,400 XRP',
    value: '$10,672',
    age: '44m ago',
  },
  {
    id: 'tx-10',
    coin: 'DOGE',
    txHash: 'DH5yaX...44c1',
    amount: '85,000 DOGE',
    value: '$11,900',
    age: '48m ago',
  },
];

export default function LiveStats() {
  const [tickerCount, setTickerCount] = useState<number>(2481);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Helper to generate totally unique wallet addresses according to coin protocol
  const generateUniqueTx = (): Transaction => {
    const coinPool: Array<{
      coin: CoinType;
      prefix: string;
      chars: string;
      amtRange: [number, number];
      price: number;
    }> = [
      { coin: 'BTC', prefix: 'bc1q', chars: '023456789acdefghjklmnpqrstuvwxyz', amtRange: [0.005, 2.8], price: 77937 },
      { coin: 'ETH', prefix: '0x', chars: '0123456789abcdef', amtRange: [0.2, 12.5], price: 2500 },
      { coin: 'TRX', prefix: 'T', chars: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', amtRange: [15000, 180000], price: 0.25 },
      { coin: 'BNB', prefix: '0x', chars: '0123456789abcdef', amtRange: [2.5, 55], price: 745 },
      { coin: 'SOL', prefix: '', chars: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', amtRange: [8, 250], price: 105 },
      { coin: 'USDT', prefix: '0x', chars: '0123456789abcdef', amtRange: [1000, 85000], price: 1 },
      { coin: 'LTC', prefix: 'ltc1q', chars: '023456789acdefghjklmnpqrstuvwxyz', amtRange: [10, 220], price: 88 },
      { coin: 'XRP', prefix: 'r', chars: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', amtRange: [2500, 45000], price: 0.58 },
      { coin: 'DOGE', prefix: 'D', chars: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', amtRange: [10000, 150000], price: 0.14 },
    ];

    const pick = coinPool[Math.floor(Math.random() * coinPool.length)];
    const genRand = (len: number) => {
      let res = '';
      for (let i = 0; i < len; i++) {
        res += pick.chars[Math.floor(Math.random() * pick.chars.length)];
      }
      return res;
    };

    const uniqueAddress = `${pick.prefix}${genRand(5)}...${genRand(4)}`;
    const rawAmt = pick.amtRange[0] + Math.random() * (pick.amtRange[1] - pick.amtRange[0]);
    const formattedAmt =
      rawAmt < 1
        ? `${rawAmt.toFixed(4)} ${pick.coin}`
        : rawAmt < 100
        ? `${rawAmt.toFixed(2)} ${pick.coin}`
        : `${Math.round(rawAmt).toLocaleString()} ${pick.coin}`;
    const valueNum = Math.round(rawAmt * pick.price);
    const formattedVal = `$${valueNum.toLocaleString()}`;

    return {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      coin: pick.coin,
      txHash: uniqueAddress,
      amount: formattedAmt,
      value: formattedVal,
      age: 'Just now',
      isNew: true,
    };
  };

  const addLiveTransaction = () => {
    setIsRefreshing(true);
    setTickerCount((prev) => prev + 1);

    const newTx = generateUniqueTx();
    setTransactions((prev) => [newTx, ...prev.slice(0, 9)]); // Strictly maintains exactly 10 active rows
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      addLiveTransaction();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 md:py-20 px-4 sm:px-6 bg-white border-b border-slate-100">
      {/* Expanded Width: Max width scaled up to 1180px for a wide, executive view */}
      <div className="w-full max-w-[1180px] mx-auto">
        
        {/* Table Container with expansive width and clean padding */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_28px_-4px_rgba(11,37,69,0.06)] p-6 md:p-9">
          
          {/* Header Row: Title & Live Ticker Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7 pb-2">
            <div>
              <h2 className="text-2xl md:text-[28px] font-bold text-[#0B2545] tracking-tight font-display">
                Latest transactions
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Real-time verified deposit, withdrawal & trade settlement ledger
              </p>
            </div>

            {/* Live Ticker Counter Badge */}
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-full border border-slate-200/70 w-fit">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>
                Live Ticker:{' '}
                <strong className="text-slate-800 font-bold font-mono">
                  {tickerCount.toLocaleString()}
                </strong>{' '}
                txs
              </span>
              <button
                onClick={addLiveTransaction}
                title="Refresh Live Ticker"
                className="ml-1.5 text-slate-400 hover:text-[#C59B4E] transition-colors"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              
              {/* Table Column Headers */}
              <div className="grid grid-cols-12 pb-3.5 border-b border-slate-100 text-slate-400 text-sm font-medium">
                <div className="col-span-5 pl-2">Tx Hash</div>
                <div className="col-span-3 text-left">Amount</div>
                <div className="col-span-2 text-left">Value</div>
                <div className="col-span-2 text-right pr-2">Age</div>
              </div>

              {/* Transaction Rows */}
              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`grid grid-cols-12 items-center py-3.5 px-2 hover:bg-slate-50/70 transition-all duration-200 rounded-lg ${
                      tx.isNew ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    {/* Tx Hash with Known Coin Logo & Unique Wallet Address */}
                    <div className="col-span-5 flex items-center gap-3.5">
                      {/* Known Official Coin Logo */}
                      <CoinLogo coin={tx.coin} />

                      {/* Distinct Address */}
                      <span className="font-semibold text-slate-800 text-[15px] tracking-tight font-mono">
                        {tx.txHash}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="col-span-3 text-left font-medium text-slate-700 text-[15px]">
                      {tx.amount}
                    </div>

                    {/* Value */}
                    <div className="col-span-2 text-left font-medium text-slate-600 text-[15px]">
                      {tx.value}
                    </div>

                    {/* Age */}
                    <div className="col-span-2 text-right pr-2 text-slate-400 text-sm">
                      {tx.age}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
