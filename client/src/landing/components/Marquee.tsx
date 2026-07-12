const ITEMS = [
  'PAY BY THE MINUTE',
  'WIREGUARD ENCRYPTED',
  'GASLESS x402',
  'USDC ON ARBITRUM',
  'PARTICLE UNIVERSAL ACCOUNTS',
  'JUST YOUR EMAIL',
  'HTTP 402 NATIVE',
  'RENT YOUR PRIVACY',
];

export function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative -rotate-1 border-y-2 border-ink bg-ink py-3 text-paper">
      <div className="flex w-max animate-marquee whitespace-nowrap will-change-transform">
        {row.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="px-6 font-graffiti text-2xl tracking-wide">
              {item}
            </span>
            <span className="font-graffiti text-2xl text-sun">✺</span>
          </span>
        ))}
      </div>
    </div>
  );
}
