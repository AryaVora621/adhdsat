import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Target, Clock, BarChart3, Clock3, Layers } from 'lucide-react';
import { MY_BUCKETS, DEFAULT_STUDY_WEIGHTS, SEC_SUB, MATH_WEAK_SUB } from '../lib/weightMatcher';

function Pie({ data, size=160 }) {
  const total = data.reduce((s,d)=> s + (d.count||0), 0) || 1;
  let angle = -90;
  const cx=size/2, cy=size/2, r=size/2 - 6;
  const toRad = deg => deg * Math.PI/180;
  const arc = (start, sweep) => {
    const end = start + sweep;
    const x1 = cx + r * Math.cos(toRad(start)), y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end)), y2 = cy + r * Math.sin(toRad(end));
    const large = sweep > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d,i)=>{
        if (!d.count) return null;
        const sweep = d.count/total*360;
        const cur = angle; angle += sweep;
        return <path key={i} d={arc(cur, sweep)} fill={d.color|| d._color || '#e8643c'} stroke='var(--bg-card)' strokeWidth={2} />;
      })}
      <circle cx={cx} cy={cy} r={r*0.52} fill='var(--bg-card)' />
      <text x={cx} y={cy} textAnchor='middle' dominantBaseline='central' fontSize='18' fontWeight='800' fill='var(--text-primary)'>{total}</text>
    </svg>
  );
}

function fmtSec(s){ if (!s) return '0m'; const m=Math.floor(s/60); const sec=s%60; return m? `${m}m ${sec}s` : `${sec}s`; }

export default function MyDrills({ user }) {
  const navigate = useNavigate();
  const [today, setToday] = useState(null);
  const [week, setWeek] = useState(null);
  const [weights, setWeights] = useState(DEFAULT_STUDY_WEIGHTS);

  useEffect(()=>{
    fetch('/api/study-weights').then(r=>r.json()).then(setWeights).catch(()=>{});
  },[]);
  useEffect(()=>{
    if (!user?.id) return;
    fetch(`/api/my-stats/${user.id}?days=1`).then(r=> r.json()).then(setToday).catch(()=>{});
    fetch(`/api/my-stats/${user.id}?days=7`).then(r=> r.json()).then(setWeek).catch(()=>{});
  },[user?.id]);

  const todayMap = {}; (today?.byBucket||[]).forEach(b=> todayMap[b.key]=b.count);
  const weekMap = {}; (week?.byBucket||[]).forEach(b=> weekMap[b.key]=b.count);

  const todayPieData = MY_BUCKETS.map(b=> ({ ...b, count: todayMap[b.key]||0 }));
  const weekPieData = MY_BUCKETS.map(b=> ({ ...b, count: weekMap[b.key]||0 }));

  const todaySecSubs = today?.secSubs || [];
  const todayMathSubs = today?.mathSubs || [];
  const todaySecPie = SEC_SUB.map((s,i)=> {
    const found = todaySecSubs.find(x=> x.key===s.key);
    const colors = { boundaries:'#e8643c', sva:'#ff8a5c', modifiers:'#46b79f', sec_mixed:'#c9a87a'};
    return { label: s.key, count: found?.count||0, color: colors[s.key]||'#888' };
  }).filter(d=> d.count>0);
  const todayMathPie = MATH_WEAK_SUB.map(s=> {
    const found = todayMathSubs.find(x=> x.key===s.key);
    const colors = { percentages:'#2e7d6f', ratios:'#46b79f', transforms:'#6b7bb5', stats:'#8a6b9e', regression:'#c98a2e', scaling:'#e8643c'};
    return { label: s.key, count: found?.count||0, color: colors[s.key]||'#888' };
  }).filter(d=> d.count>0);

  return (
    <div style={{ padding:'clamp(16px,5vw,48px)', maxWidth:'980px', margin:'0 auto', width:'100%'}}>
      <h1 style={{ fontSize:'1.8rem', fontWeight:800, marginBottom:'6px', display:'flex', alignItems:'center', gap:'10px'}}><Layers size={22} color='var(--primary)'/> My Drills</h1>
      <p style={{ color:'var(--text-secondary)', marginBottom:'14px'}}>Targeted drills per your 30/30/15/10/10/5 split. Open to all (no gate).</p>

      {/* Schedule banner */}
      <div style={{ backgroundColor:'rgba(232,100,60,0.06)', border:'1px solid rgba(232,100,60,0.15)', borderRadius:'12px', padding:'14px 18px', marginBottom:'16px'}}>
        <div style={{ fontSize:'0.68rem', color:'var(--primary)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600, marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px'}}><Target size={12}/> 7-Day Schedule (10h)</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:'6px', fontSize:'0.76rem'}}>
          <span><b>Mon</b> 45m Grammar + 45m Math %</span><span><b>Tue</b> 45m SVA + 30m Inference + 15m Vocab</span>
          <span><b>Wed</b> 60m Ratios/Transforms + 30m Expression</span><span><b>Thu</b> 30m Modifiers + 45m Stats + 15m Review</span>
          <span><b>Fri</b> 45m Inference + 30m Scaling + 15m Maint</span><span><b>Sat</b> 30m Mixed + 30m Review</span><span><b>Sun</b> Light review</span>
        </div>
      </div>

      {/* Time stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'10px', marginBottom:'16px'}}>
        <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px', textAlign:'center'}}>
          <div style={{ fontSize:'0.62rem', color:'var(--text-secondary)', textTransform:'uppercase'}}>Today answers</div>
          <div style={{ fontSize:'1.5rem', fontWeight:800}}>{today?.totalAnswers ?? '—'}</div>
          <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)'}}>{fmtSec(today?.answerSeconds)} answer time · {fmtSec(today?.sprintSeconds)} sprint</div>
        </div>
        <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px', textAlign:'center'}}>
          <div style={{ fontSize:'0.62rem', color:'var(--text-secondary)', textTransform:'uppercase'}}>Week answers</div>
          <div style={{ fontSize:'1.5rem', fontWeight:800}}>{week?.totalAnswers ?? '—'}</div>
          <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)'}}>{fmtSec(week?.answerSeconds)} · {week?.totalSeconds ? Math.round(week.totalSeconds/60)+'m total' : ''}</div>
        </div>
        <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px', textAlign:'center'}}>
          <div style={{ fontSize:'0.62rem', color:'var(--text-secondary)', textTransform:'uppercase'}}>Target split</div>
          <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', lineHeight:1.5, marginTop:'6px'}}>30% Grammar · 30% Math weak · 15% Inference · 10% Expression · 10% Maint · 5% Vocab</div>
        </div>
      </div>

      {/* Pies */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'14px', marginBottom:'18px'}}>
        <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'14px', padding:'16px'}}>
          <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'6px'}}><BarChart3 size={14}/> Today · 6 buckets</div>
          <div style={{ display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap'}}>
            <Pie data={todayPieData} size={150}/>
            <div style={{ flex:1, minWidth:'140px'}}>
              {MY_BUCKETS.map(b=> (
                <div key={b.key} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.78rem', marginBottom:'4px'}}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', backgroundColor:b.color, flexShrink:0}}/>
                  <span style={{ flex:1, color:'var(--text-secondary)'}}>{b.label}</span>
                  <span style={{ fontWeight:700}}>{todayMap[b.key]||0}</span>
                </div>
              ))}
              {!today?.totalAnswers && <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)', marginTop:'6px'}}>No answers today yet. Start a drill.</div>}
            </div>
          </div>
        </div>
        <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'14px', padding:'16px'}}>
          <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'6px'}}><Clock3 size={14}/> Week · 6 buckets</div>
          <div style={{ display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap'}}>
            <Pie data={weekPieData} size={150}/>
            <div style={{ flex:1, minWidth:'140px'}}>
              {MY_BUCKETS.map(b=> (
                <div key={b.key} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.78rem', marginBottom:'4px'}}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', backgroundColor:b.color, flexShrink:0}}/>
                  <span style={{ flex:1, color:'var(--text-secondary)'}}>{b.label}</span>
                  <span style={{ fontWeight:700}}>{weekMap[b.key]||0}</span>
                </div>
              ))}
              {!week?.totalAnswers && <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)', marginTop:'6px'}}>No answers this week yet.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Today sub-weights pies */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'14px', marginBottom:'18px'}}>
        <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'14px', padding:'16px'}}>
          <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px'}}>Today · Grammar sub-weights</div>
          {todaySecPie.length ? (
            <div style={{ display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap'}}>
              <Pie data={todaySecPie.map(d=> ({...d, color:d.color}))} size={130}/>
              <div style={{ flex:1}}>
                {todaySecPie.map(d=> <div key={d.label} style={{ display:'flex', gap:'8px', fontSize:'0.78rem', marginBottom:'3px'}}><span style={{ width:'8px', height:'8px', borderRadius:'50%', backgroundColor:d.color, marginTop:'5px', flexShrink:0}}/><span style={{ flex:1, color:'var(--text-secondary)'}}>{d.label}</span><span style={{ fontWeight:600}}>{d.count}</span></div>)}
                <div style={{ fontSize:'0.68rem', color:'var(--text-secondary)', marginTop:'6px'}}>Target 40% boundaries · 35% SVA · 15% modifiers · 10% mixed (30 total Grammar Qs = ~12/10/4/3)</div>
              </div>
            </div>
          ) : <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)'}}>No Grammar answers today yet.</div>}
        </div>
        <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'14px', padding:'16px'}}>
          <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px'}}>Today · Math weak sub-weights</div>
          {todayMathPie.length ? (
            <div style={{ display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap'}}>
              <Pie data={todayMathPie.map(d=> ({...d, color:d.color}))} size={130}/>
              <div style={{ flex:1}}>
                {todayMathPie.map(d=> <div key={d.label} style={{ display:'flex', gap:'8px', fontSize:'0.78rem', marginBottom:'3px'}}><span style={{ width:'8px', height:'8px', borderRadius:'50%', backgroundColor:d.color, marginTop:'5px', flexShrink:0}}/><span style={{ flex:1, color:'var(--text-secondary)'}}>{d.label}</span><span style={{ fontWeight:600}}>{d.count}</span></div>)}
                <div style={{ fontSize:'0.68rem', color:'var(--text-secondary)', marginTop:'6px'}}>Target 25% % · 20% ratios · 20% transforms · 15% stats · 10% regression · 10% scaling</div>
              </div>
            </div>
          ) : <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)'}}>No Math weak answers today yet.</div>}
        </div>
      </div>

      {/* Six drill launchers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'12px', marginBottom:'18px'}}>
        {MY_BUCKETS.map(b=> {
          const cntToday = todayMap[b.key]||0;
          const cntWeek = weekMap[b.key]||0;
          const targetPct = weights.buckets[b.key];
          return (
            <div key={b.key} style={{ backgroundColor:'var(--bg-card)', border:`1px solid ${b.color}35`, borderRadius:'14px', padding:'16px', display:'flex', flexDirection:'column', gap:'10px'}}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{ width:'10px', height:'28px', borderRadius:'6px', backgroundColor:b.color, flexShrink:0}}/>
                <div style={{ flex:1}}>
                  <div style={{ fontWeight:700, fontSize:'0.95rem'}}>{b.label}</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)'}}>Target {targetPct}% · Today {cntToday} · Week {cntWeek}</div>
                </div>
                <Zap size={16} color={b.color} />
              </div>
              {b.key==='sec' && <div style={{ fontSize:'0.68rem', color:'var(--text-secondary)'}}>40% boundaries · 35% SVA · 15% modifiers</div>}
              {b.key==='math_weak' && <div style={{ fontSize:'0.68rem', color:'var(--text-secondary)'}}>25% % · 20% ratios · 20% transforms · 15% stats</div>}
              <button className='primary' onClick={()=> navigate(`/my-focus?bucket=${b.key}`)} style={{ width:'100%', padding:'11px', fontSize:'0.9rem', fontWeight:700, backgroundColor:b.color, borderColor:b.color}}>Start {b.label.split(':')[0].split(' ')[0]} Drill →</button>
            </div>
          );
        })}
      </div>

      <div style={{ display:'flex', gap:'10px'}}>
        <button className='primary' onClick={()=> navigate('/my-focus')} style={{ flex:1, padding:'14px', fontSize:'1rem', fontWeight:700}}><Zap size={16}/> Start My Focus Sprint (weighted)</button>
        <button onClick={()=> navigate('/')} style={{ padding:'14px', color:'var(--text-secondary)'}}>Dashboard</button>
      </div>
    </div>
  );
}
