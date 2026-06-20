export default function Watchlist() {
  const stocks = [
    { symbol: 'RELIANCE', price: '2950.50', change: '+2.4%', changeColor: '#10b981' },
    { symbol: 'TCS', price: '4520.25', change: '+1.8%', changeColor: '#10b981' },
    { symbol: 'INFY', price: '2185.75', change: '-0.5%', changeColor: '#ef4444' },
    { symbol: 'HDFCBANK', price: '1645.30', change: '+3.2%', changeColor: '#10b981' },
    { symbol: 'ICICIBANK', price: '1185.50', change: '-1.2%', changeColor: '#ef4444' }
  ];

  return (
    <div style={{
      background: '#1f2937',
      borderRadius: '12px',
      padding: '20px',
      color: 'white'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Watchlist</h3>
      <div style={{
        overflowY: 'auto',
        maxHeight: '400px'
      }}>
        {stocks.map((stock) => (
          <div key={stock.symbol} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 8px',
            borderBottom: '1px solid #374151',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#374151'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{stock.symbol}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>₹{stock.price}</div>
            </div>
            <div style={{ color: stock.changeColor, fontWeight: 'bold' }}>
              {stock.change}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}