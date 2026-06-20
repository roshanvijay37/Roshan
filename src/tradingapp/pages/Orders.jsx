import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function Orders() {
  const ordersData = [
    { id: 1, symbol: 'RELIANCE', orderType: 'BUY', quantity: 10, price: 2850.50, status: 'FILLED', timestamp: '2026-06-20 09:15', executedQty: 10, executedPrice: 2850.50 },
    { id: 2, symbol: 'TCS', orderType: 'SELL', quantity: 5, price: 4520.00, status: 'FILLED', timestamp: '2026-06-20 09:20', executedQty: 5, executedPrice: 4520.25 },
    { id: 3, symbol: 'INFY', orderType: 'BUY', quantity: 15, price: 2210.00, status: 'FILLED', timestamp: '2026-06-20 09:35', executedQty: 15, executedPrice: 2210.10 },
    { id: 4, symbol: 'HDFCBANK', orderType: 'BUY', quantity: 8, price: 1594.50, status: 'PENDING', timestamp: '2026-06-20 10:05', executedQty: 0, executedPrice: 0 },
    { id: 5, symbol: 'ICICIBANK', orderType: 'BUY', quantity: 12, price: 1200.00, status: 'FILLED', timestamp: '2026-06-20 10:12', executedQty: 12, executedPrice: 1200.15 },
    { id: 6, symbol: 'WIPRO', orderType: 'SELL', quantity: 20, price: 450.00, status: 'CANCELLED', timestamp: '2026-06-20 10:30', executedQty: 0, executedPrice: 0 },
    { id: 7, symbol: 'BAJAJFINSV', orderType: 'BUY', quantity: 3, price: 1800.00, status: 'FILLED', timestamp: '2026-06-20 11:00', executedQty: 3, executedPrice: 1801.50 },
    { id: 8, symbol: 'MARUTI', orderType: 'SELL', quantity: 2, price: 11200.00, status: 'FILLED', timestamp: '2026-06-20 11:15', executedQty: 2, executedPrice: 11198.50 },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'FILLED':
        return '#10b981';
      case 'PENDING':
        return '#f59e0b';
      case 'CANCELLED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getOrderTypeColor = (orderType) => {
    return orderType === 'BUY' ? '#3b82f6' : '#ef4444';
  };

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
          <h2 style={{ color: 'white', marginTop: 0 }}>Order History</h2>

          {/* Orders Table */}
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
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#d1d5db' }}>Order ID</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#d1d5db' }}>Symbol</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#d1d5db' }}>Type</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>Qty</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>Price</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#d1d5db' }}>Executed</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#d1d5db' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#d1d5db' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersData.map((order, index) => (
                    <tr key={order.id} style={{
                      borderBottom: index !== ordersData.length - 1 ? '1px solid #374151' : 'none',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#274151'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontSize: '14px', color: '#9ca3af' }}>#{order.id}</td>
                      <td style={{ padding: '16px', fontWeight: '600' }}>{order.symbol}</td>
                      <td style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: getOrderTypeColor(order.orderType),
                        fontWeight: '600'
                      }}>
                        {order.orderType}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>{order.quantity}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>₹{order.price.toFixed(2)}</td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#9ca3af' }}>
                        {order.executedQty > 0 ? `${order.executedQty} @ ₹${order.executedPrice.toFixed(2)}` : '-'}
                      </td>
                      <td style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: getStatusColor(order.status),
                        fontWeight: '600',
                        fontSize: '12px'
                      }}>
                        <span style={{
                          background: getStatusColor(order.status) + '20',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#9ca3af' }}>{order.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary Statistics */}
          <div style={{
            marginTop: '20px',
            background: '#1f2937',
            borderRadius: '12px',
            padding: '20px',
            color: 'white',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Total Orders</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>8</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>5 Filled, 1 Pending, 2 Cancelled</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Buy Orders</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#3b82f6' }}>5</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Total: 48 shares</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Sell Orders</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>3</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Total: 27 shares</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Avg Price</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>₹4,142</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Across all orders</div>
            </div>
          </div>

          {/* Recent Activity Info */}
          <div style={{
            marginTop: '20px',
            background: '#1f2937',
            borderRadius: '12px',
            padding: '16px',
            color: '#9ca3af',
            fontSize: '13px'
          }}>
            <p style={{ margin: '0 0 8px 0' }}>📊 <strong>Tip:</strong> Your filled orders are immediately reflected in your holdings.</p>
            <p style={{ margin: 0 }}>⏱️ <strong>Note:</strong> Pending orders are waiting for market liquidity at your specified price.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
