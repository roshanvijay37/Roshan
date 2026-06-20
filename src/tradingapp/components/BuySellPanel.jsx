import { useState } from 'react';

export default function BuySellPanel() {
  const [symbol, setSymbol] = useState('NSE:NIFTY');
  const [quantity, setQuantity] = useState('1');
  const [orderType, setOrderType] = useState('market');

  const handleBuy = () => {
    console.log('Buy Order:', { symbol, quantity, type: orderType });
    alert(`Buy Order: ${quantity} units of ${symbol} (${orderType})`);
  };

  const handleSell = () => {
    console.log('Sell Order:', { symbol, quantity, type: orderType });
    alert(`Sell Order: ${quantity} units of ${symbol} (${orderType})`);
  };

  return (
    <div style={{
      background: '#1f2937',
      borderRadius: '12px',
      padding: '20px',
      color: 'white',
      maxWidth: '400px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Trade</h3>

      {/* Symbol Input */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#d1d5db' }}>
          Symbol
        </label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          style={{
            width: '100%',
            padding: '10px',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
          placeholder="Enter symbol"
        />
      </div>

      {/* Quantity Input */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#d1d5db' }}>
          Quantity
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
          placeholder="1"
          min="1"
        />
      </div>

      {/* Order Type Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#d1d5db' }}>
          Order Type
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setOrderType('market')}
            style={{
              flex: 1,
              padding: '10px',
              background: orderType === 'market' ? '#3b82f6' : '#374151',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: orderType === 'market' ? '600' : '400',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (orderType !== 'market') e.target.style.background = '#4b5563';
            }}
            onMouseLeave={(e) => {
              if (orderType !== 'market') e.target.style.background = '#374151';
            }}
          >
            Market
          </button>
          <button
            onClick={() => setOrderType('limit')}
            style={{
              flex: 1,
              padding: '10px',
              background: orderType === 'limit' ? '#3b82f6' : '#374151',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: orderType === 'limit' ? '600' : '400',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (orderType !== 'limit') e.target.style.background = '#4b5563';
            }}
            onMouseLeave={(e) => {
              if (orderType !== 'limit') e.target.style.background = '#374151';
            }}
          >
            Limit
          </button>
        </div>
      </div>

      {/* Buy and Sell Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button
          onClick={handleBuy}
          style={{
            padding: '12px',
            background: '#10b981',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = '#059669'}
          onMouseLeave={(e) => e.target.style.background = '#10b981'}
        >
          BUY
        </button>
        <button
          onClick={handleSell}
          style={{
            padding: '12px',
            background: '#ef4444',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = '#dc2626'}
          onMouseLeave={(e) => e.target.style.background = '#ef4444'}
        >
          SELL
        </button>
      </div>
    </div>
  );
}
