import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import DashboardCard from '../components/DashboardCard';
import TradingChart from '../components/TradingChart';
import Watchlist from '../components/Watchlist';

export default function Dashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#111827' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Dashboard Cards Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <DashboardCard title='NIFTY' value='25100' />
            <DashboardCard title='BANKNIFTY' value='56000' />
            <DashboardCard title='SENSEX' value='82000' />
            <DashboardCard title='P&L' value='₹0' />
          </div>

          {/* Trading Chart */}
          <div>
            <TradingChart />
          </div>

          {/* Watchlist */}
          <div>
            <Watchlist />
          </div>
        </div>
      </div>
    </div>
  );
}