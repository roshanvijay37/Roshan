import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import DashboardCard from '../components/DashboardCard';

export default function Dashboard() {
  return (
    <div>
      <Header />
      <div style={{display:'flex'}}>
        <Sidebar />
        <div style={{padding:'20px',display:'flex',gap:'20px'}}>
          <DashboardCard title='NIFTY' value='25100' />
          <DashboardCard title='BANKNIFTY' value='56000' />
          <DashboardCard title='SENSEX' value='82000' />
          <DashboardCard title='P&L' value='₹0' />
        </div>
      </div>
    </div>
  );
}
