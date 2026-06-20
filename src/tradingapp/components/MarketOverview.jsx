export default function MarketOverview() {
  const markets = [
    { symbol: 'NIFTY', value: 25150.45, change: '+145.50', changePercent: '+0.58%', changeColor: '#10b981' },
    { symbol: 'BANKNIFTY', value: 56280.15, change: '+285.75', changePercent: '+0.51%', changeColor: '#10b981' },
    { symbol: 'SENSEX', value: 82450.30, change: '+325.40', changePercent: '+0.40%', changeColor: '#10b981' }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '20px'
    }}>
      {markets.map((market) => (
        <div key={market.symbol} style={{
          background: '#1f2937',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{market.symbol}</h3>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Live</div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
              {market.value.toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: market.changeColor, fontWeight: '600' }}>
              {market.change}
            </div>
            <div style={{ color: market.changeColor, fontWeight: '600', fontSize: '14px' }}>
              {market.changePercent}
            </div>
          </div>

          <div style={{
            marginTop: '12px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, ' + market.changeColor + ', transparent)',
            borderRadius: '2px'
          }}></div>
        </div>
      ))}
    </div>
  );
}
