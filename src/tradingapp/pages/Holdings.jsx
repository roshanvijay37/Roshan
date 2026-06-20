import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function Holdings() {
  const holdingsData = [
    { symbol: 'RELIANCE', quantity: 25, currentValue: 73762.5, dayChange: '+2.4%', dayChangeValue: '+1725', dayChangeColor: '#10b981' },
    { symbol: 'TCS', quantity: 10, currentValue: 45202.5, dayChange: '+1.8%', dayChangeValue: '+800', dayChangeColor: '#10b981' },
    { symbol: 'INFY', quantity: 20, currentValue: 43715, dayChange: '-0.5%', dayChangeValue: '-220', dayChangeColor: '#ef4444' },
    { symbol: 'HDFCBANK', quantity: 15, currentValue: 24679.5, dayChange: '+3.2%', dayChangeValue: '+725', dayChangeColor: '#10b981' },
    { symbol: 'ICICIBANK', quantity: 30, currentValue: 35565, dayChange: '-1.2%', dayChangeValue: '-435', dayChangeColor: '#ef4444' },
    { symbol: 'WIPRO', quantity: 50, currentValue: 27850, dayChange: '+0.8%', dayChangeValue: '+220', dayChangeColor: '#10b981' }
  ];

  const totalValue = holdingsData.reduce((sum, h) => sum + h.currentValue, 0);
  const totalDay = 1815;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#111827' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h2 style={{ color: 'white', marginTop: 0 }}>Holdings</h2>

          {/* Holdings Summary */}
          <div style={{
            background: '#1f2937',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            color: 'white',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Total Holdings Value</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>₹{totalValue.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Day's Change</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>+₹{totalDay.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Holdings Count</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{holdingsData.length}</div>
            </div>
          </div>

          {/* Holdings Table */}
          <div style={{
            background: '#1f2937',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              overflowX: 'auto'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                color: 'white'
              }}>
                <thead>
                  <tr style={{ background: '#111827', borderBottom: '2px solid #374151' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#d1d5db' }}>Symbol</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>Quantity</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>Current Value</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>Day Change</th>
                  </tr>
                </thead>
                <tbody>
                  {holdingsData.map((holding, index) => (
                    <tr key={holding.symbol} style={{
                      borderBottom: index !== holdingsData.length - 1 ? '1px solid #374151' : 'none',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#274151'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontWeight: '600' }}>{holding.symbol}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>{holding.quantity}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>₹{holding.currentValue.toFixed(2)}</td>
                      <td style={{ padding: '16px', textAlign: 'right', color: holding.dayChangeColor, fontWeight: '600' }}>
                        {holding.dayChange} ({holding.dayChangeValue})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}