export default function DashboardCard({ title, value }) {
  return (
    <div style={{background:'#1f2937',color:'white',padding:'20px',borderRadius:'12px',minWidth:'180px'}}>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}
