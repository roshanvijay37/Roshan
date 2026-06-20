export default function Sidebar() {
  const items = ['Dashboard','Watchlist','Orders','Positions','Holdings','Risk'];

  return (
    <aside style={{width:'220px',background:'#1f2937',color:'white',padding:'20px',minHeight:'100vh'}}>
      <h3>Menu</h3>
      {items.map(item => (
        <div key={item} style={{padding:'12px 0',cursor:'pointer'}}>
          {item}
        </div>
      ))}
    </aside>
  );
}
