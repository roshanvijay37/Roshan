import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function Positions() {
  const positionsData = [
    { symbol: 'RELIANCE', qty: 10, avgPrice: 2850.50, ltp: 2950.50, pnl: 1000, pnlPercent: '+3.5%', pnlColor: '#10b981' },
    { symbol: 'TCS', qty: 5, avgPrice: 4450.00, ltp: 4520.25, pnl: 351.25, pnlPercent: '+1.6%', pnlColor: '#10b981' },
    { symbol: 'INFY', qty: 15, avgPrice: 2210.00, ltp: 2185.75, pnl: -366.25, pnlPercent: '-1.1%', pnlColor: '#ef4444' },
    { symbol: 'HDFCBANK', qty: 8, avgPrice: 1594.50, ltp: 1645.30, pnl: 408, pnlPercent: '+3.2%', pnlColor: '#10b981' },
    { symbol: 'ICICIBANK', qty: 12, avgPrice: 1200.00, ltp: 1185.50, pnl: -174, pnlPercent: '-1.2%', pnlColor: '#ef4444' }
  ];

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
          <h2 style={{ color: 'white', marginTop: 0 }}>Positions</h2>

          {/* Positions Table */}
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
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>Qty</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>Avg Price</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>LTP</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>P&L</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {positionsData.map((position, index) => (
                    <tr key={position.symbol} style={{
                      borderBottom: index !== positionsData.length - 1 ? '1px solid #374151' : 'none',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#274151'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontWeight: '600' }}>{position.symbol}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>{position.qty}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>₹{position.avgPrice.toFixed(2)}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>₹{position.ltp.toFixed(2)}</td>
                      <td style={{ padding: '16px', textAlign: 'right', color: position.pnlColor, fontWeight: '600' }}>
                        ₹{position.pnl.toFixed(2)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', color: position.pnlColor, fontWeight: '600' }}>
                        {position.pnlPercent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Card */}
          <div style={{
            marginTop: '20px',
            background: '#1f2937',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Total P&L</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>₹1,219</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Open Positions</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>5</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Total Value</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>₹60,234</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}