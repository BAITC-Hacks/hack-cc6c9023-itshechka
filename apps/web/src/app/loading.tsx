export default function Loading() {
  return <div className="page"><div className="skeleton skeleton--title" /><div className="stats-grid">{[1,2,3,4].map((item) => <div key={item} className="skeleton skeleton--card" />)}</div><div className="skeleton skeleton--panel" /></div>;
}

