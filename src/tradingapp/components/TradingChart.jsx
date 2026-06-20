import { useEffect, useRef } from 'react';

export default function TradingChart() {
  const containerRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: 'NSE:NIFTY',
          interval: 'D',
          timezone: 'Asia/Kolkata',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview-widget'
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div
      style={{
        background: '#1f2937',
        borderRadius: '12px',
        padding: '20px',
        color: 'white',
        height: '400px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden'
      }}
    >
      <div
        id="tradingview-widget"
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}
