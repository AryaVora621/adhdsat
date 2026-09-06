import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ChevronRight, AlertCircle, Zap, Trophy, Target, Clock, BarChart3 } from 'lucide-react';
import MathText from '../components/MathText';
import TestToolbar from '../components/TestToolbar';
import StrikeToggle from '../components/StrikeToggle';
import ReferenceSheet from '../components/ReferenceSheet';
import DesmosCalculator from '../components/DesmosCalculator';
import { useTestToolbarState, TEXT_SIZE_SCALE } from '../lib/useTestToolbarState';
import { applyHighlightToSelection } from '../lib/highlightSelection';
import { MY_BUCKETS, DEFAULT_STUDY_WEIGHTS } from '../lib/weightMatcher';

const DIFF_XP = { easy: 15, medium: 20, hard: 30 };

const QuestionMathContent = React.memo(function QuestionMathContent({ question }) {
  return (
    <>
      {question.passage_text && (
        <div style={{ flex: 1, borderRight: window.innerWidth < 768 ? 'none' : '1px solid var(--border)', borderBottom: window.innerWidth < 768 ? '1px solid var(--border)' : 'none', paddingRight: window.innerWidth < 768 ? '0' : '32px', paddingBottom: window.innerWidth < 768 ? '16px' : '0', fontSize: '0.95em', lineHeight: 1.75, color: 'var(--text-secondary)' }}>
          <MathText>{question.passage_text}</MathText>
        </div>
      )}
      <div style={{ flex: question.passage_text ? 1 : 'none', width: question.passage_text ? 'auto' : '100%', fontSize: '1.1em', lineHeight: 1.65, overflowX: 'auto', minWidth: 0 }}>
        <MathText>{question.question_text}</MathText>
      </div>
    </>
  );
});

function ScheduleBanner() {
  return (
    <div style={{ backgroundColor: 'rgba(232,100,60,0.06)', border: '1px solid rgba(232,100,60,0.15)', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Target size={12}/> 7-Day Plan (10h model)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', fontSize: '0.76rem' }}>
        <span><b>Mon</b> Grammar 45m + Math % 45m</span>
        <span><b>Tue</b> SVA 45m + Inference 30m + Vocab 15m</span>
        <span><b>Wed</b> Ratios/Transforms 60m + Expression 30m</span>
        <span><b>Thu</b> Modifiers 30m + Stats 45m + Review 15m</span>
        <span><b>Fri</b> Inference 45m + Scaling 30m + Maint 15m</span>
        <span><b>Sat</b> Mixed sprint 30m + Review 30m</span>
        <span><b>Sun</b> Light review / score check</span>
      </div>
      <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Today’s mix auto-weights: <b>30% Grammar</b> · 30% Math weak · 15% Inference · 10% Expression · 10% Maint · 5% Vocab</div>
    </div>
  );
}

export default function MyFocus({ user, setUser }) {
  const [searchParams] = useSearchParams();
  const bucket = searchParams.get('bucket'); // optional e.g., ?bucket=sec
  const navigate = useNavigate();
  const [weights, setWeights] = useState(DEFAULT_STUDY_WEIGHTS);
  const [sprintId, setSprintId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [questionNum, setQuestionNum] = useState(1);
  const [stats, setStats] = useState({ attempted: 0, correct: 0, xp: 0 });
  const [showSummary, setShowSummary] = useState(false);
  const [finalStats, setFinalStats] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [sprintLength, setSprintLength] = useState(10);
  const questionQueueRef = useRef([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const timeStartRef = useRef(Date.now());
  const toolbar = useTestToolbarState();
  const questionContentRef = useRef(null);
  const sprintStartRef = useRef(null);

  useEffect(() => {
    fetch('/api/study-weights').then(r => r.json()).then(setWeights).catch(()=>{});
  }, []);

  const startTimer = () => {
    clearInterval(timerRef.current);
    setElapsed(0);
    timeStartRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - timeStartRef.current)/1000)), 1000);
  };
  const stopTimer = () => clearInterval(timerRef.current);
  useEffect(()=> ()=> clearInterval(timerRef.current), []);

  const bucketLabel = bucket ? (MY_BUCKETS.find(b=> b.key===bucket)?.label || bucket) : null;

  const startSprint = async (len=10) => {
    setSprintLength(len);
    setLoading(true);
    sprintStartRef.current = Date.now();
    try {
      const res = await fetch('/api/sprints', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: user.id, sprint_type: bucket ? `drill-${bucket}` : 'my-focus' })});
      const data = await res.json();
      setSprintId(data.id);
      setStarted(true);
      await fetchNextBatch(len, bucket);
    } catch { setLoading(false); }
  };

  const fetchNextBatch = async (len, forcedBucket) => {
    setSelectedChoice(null); setIsAnswered(false); setHintsUsed(0);
    toolbar.resetPerQuestion();
    if (questionQueueRef.current.length > 0) {
      const q = questionQueueRef.current.shift();
      setQuestion(q); setLoading(false); startTimer(); return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id, count: String(len), myFocus: '1' });
      if (forcedBucket) params.set('bucket', forcedBucket);
      const res = await fetch(`/api/questions/batch?${params.toString()}`);
      const data = await res.json();
      const qs = data.questions || [];
      if (!qs.length) throw new Error('no questions');
      const first = qs.shift();
      questionQueueRef.current = qs;
      setQuestion(first);
      startTimer();
    } catch { } finally { setLoading(false); }
  };

  const fetchNextQuestion = async () => {
    toolbar.resetPerQuestion(); setSelectedChoice(null); setIsAnswered(false); setHintsUsed(0);
    if (questionQueueRef.current.length > 0) {
      const q = questionQueueRef.current.shift();
      setQuestion(q); startTimer(); return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id, count: '6', myFocus: '1' });
      if (bucket) params.set('bucket', bucket);
      const res = await fetch(`/api/questions/batch?${params.toString()}`);
      const data = await res.json();
      const qs = data.questions || [];
      if (qs.length) { const first = qs.shift(); questionQueueRef.current = qs; setQuestion(first); startTimer(); }
    } catch {} finally { setLoading(false); }
  };

  const handleAnswerSubmit = useCallback(async () => {
    if (!selectedChoice || isAnswered) return;
    stopTimer();
    const timeSpent = Math.round((Date.now() - timeStartRef.current)/1000);
    let correct = false;
    if (question.is_grid_in) correct = parseFloat(selectedChoice) === question.grid_in_answer;
    else correct = !!question.choices.find(c=> c.label===selectedChoice)?.is_correct;
    const xpGained = correct ? (DIFF_XP[question.difficulty]||20) : 5;
    setIsAnswered(true);
    setStats(prev=> ({ attempted: prev.attempted+1, correct: prev.correct + (correct?1:0), xp: prev.xp + xpGained }));
    if (!correct) {
      setWrongAnswers(prev=> [...prev, { id: question.id, text: question.question_text, domain: question.domain, selectedChoice, selectedText: question.choices.find(c=>c.label===selectedChoice)?.text||selectedChoice, correctLabel: question.choices.find(c=>c.is_correct)?.label||'', correctAnswer: question.is_grid_in? String(question.grid_in_answer) : question.choices.find(c=>c.is_correct)?.text||'', explanation: question.explanation||'' }]);
    }
    try {
      await fetch('/api/answers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: user.id, question_id: question.id, selected_choice: selectedChoice, is_correct: correct?1:0, hints_used: hintsUsed, time_spent_seconds: timeSpent, sprint_id: sprintId })});
      const userRes = await fetch(`/api/users/${user.id}/xp`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ xp_gained: xpGained })});
      setUser(await userRes.json());
      if (questionNum < sprintLength) {
        // prefetch next batch in background if queue low
        if (questionQueueRef.current.length < 2) {
          const params = new URLSearchParams({ userId: user.id, count: '6', myFocus: '1' });
          if (bucket) params.set('bucket', bucket);
          fetch(`/api/questions/batch?${params.toString()}`).then(r=>r.json()).then(d=> { if (d.questions) questionQueueRef.current.push(...d.questions); }).catch(()=>{});
        }
      }
    } catch {}
  }, [selectedChoice, isAnswered, question, hintsUsed, sprintId, stats, questionNum, sprintLength]);

  const finishSprint = useCallback(async () => {
    stopTimer();
    try { await fetch(`/api/sprints/${sprintId}/finish`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ questions_attempted: stats.attempted, questions_correct: stats.correct, xp_earned: stats.xp })}); } catch {}
    setFinalStats(stats); setShowSummary(true);
  }, [sprintId, stats]);

  const handleNext = useCallback(async () => {
    if (questionNum >= sprintLength) { await finishSprint(); }
    else { setQuestionNum(n=> n+1); await fetchNextQuestion(); }
  }, [questionNum, sprintLength]);

  // Keyboard 1-4 / Enter / h
  useEffect(()=> {
    const onKey = (e)=> {
      if (!started || loading || showSummary || !question) return;
      if (e.target.tagName==='INPUT') return;
      if (!isAnswered) {
        if (['1','2','3','4'].includes(e.key) && !question.is_grid_in) {
          const label = ['A','B','C','D'][parseInt(e.key)-1];
          if (question.choices.find(c=>c.label===label)) setSelectedChoice(label);
        }
        if (e.key==='Enter') handleAnswerSubmit();
        if (e.key==='h'||e.key==='H') if (hintsUsed<2) setHintsUsed(h=>h+1);
      } else { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); handleNext(); } }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown',onKey);
  }, [started, loading, showSummary, question, isAnswered, hintsUsed, handleAnswerSubmit, handleNext]);

  if (showSummary && finalStats) {
    const acc = finalStats.attempted ? Math.round(finalStats.correct/finalStats.attempted*100):0;
    return (
      <div style={{ padding:'clamp(16px,5vw,48px)', maxWidth:'600px', margin:'0 auto', width:'100%', textAlign:'center'}}>
        <Trophy size={44} color='var(--xp-gold)' style={{ marginBottom:'14px'}}/>
        <h1 style={{ fontSize:'1.9rem', fontWeight:800, marginBottom:'6px'}}>My Focus Complete!</h1>
        <p style={{ color:'var(--text-secondary)', marginBottom:'18px'}}>{bucketLabel ? bucketLabel+' drill · ' : ''}{sprintLength}Q · weighted 30/30/15 · {Math.floor((Date.now()-sprintStartRef.current)/1000/60)}m</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'16px'}}>
          {[ {label:'Correct', value:`${finalStats.correct}/${finalStats.attempted}`}, {label:'Accuracy', value:`${acc}%`}, {label:'XP', value:`+${finalStats.xp}`}].map(s=> (
            <div key={s.label} style={{ backgroundColor:'var(--bg-card)', padding:'14px 10px', borderRadius:'12px', border:'1px solid var(--border)'}}>
              <div style={{ fontSize:'0.62rem', color:'var(--text-secondary)', textTransform:'uppercase', marginBottom:'4px'}}>{s.label}</div>
              <div style={{ fontSize:'1.35rem', fontWeight:800}}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:'10px'}}>
          <button onClick={()=> navigate('/my-drills')} style={{ flex:1, padding:'12px', borderColor:'var(--border)', color:'var(--text-secondary)'}}>Back to Drills</button>
          <button className='primary' onClick={()=> { setShowSummary(false); setFinalStats(null); setStats({attempted:0,correct:0,xp:0}); setQuestionNum(1); setWrongAnswers([]); questionQueueRef.current=[]; setStarted(false); }} style={{ flex:1, padding:'12px'}}>Again</button>
        </div>
        <button onClick={()=> navigate('/')} style={{ marginTop:'10px', color:'var(--text-secondary)'}}>Dashboard</button>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{ padding:'clamp(16px,5vw,48px)', maxWidth:'720px', margin:'0 auto', width:'100%'}}>
        <h1 style={{ fontSize:'1.8rem', fontWeight:800, marginBottom:'6px', display:'flex', alignItems:'center', gap:'10px'}}><Zap size={22} color='var(--primary)'/> {bucketLabel ? `${bucketLabel} Drill` : 'My Focus'}</h1>
        <p style={{ color:'var(--text-secondary)', marginBottom:'16px'}}>{bucketLabel ? `Focused drill on ${bucketLabel}.` : 'Weighted sprint using your 30/30/15/10/10/5 split.'} Open to all for now (temporarily no ID gate).</p>
        <ScheduleBanner/>
        <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px 16px', marginBottom:'16px', display:'flex', gap:'10px', flexWrap:'wrap'}}>
          {MY_BUCKETS.map(b=> (
            <span key={b.key} style={{ display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'0.76rem', backgroundColor: bucket===b.key? 'rgba(232,100,60,0.1)':'var(--bg-main)', border:`1px solid ${bucket===b.key? 'var(--primary)':'var(--border)'}`, color: bucket===b.key? 'var(--primary)':'var(--text-secondary)', padding:'5px 10px', borderRadius:'20px'}}>
              <span style={{ width:'8px', height:'8px', borderRadius:'50%', backgroundColor:b.color}}/> {b.label} {b.pct}%
            </span>
          ))}
        </div>
        <div style={{ display:'flex', gap:'8px', marginBottom:'14px'}}>
          {[5,10,15,20].map(n=> (
            <button key={n} onClick={()=> setSprintLength(n)} style={{ padding:'8px 16px', borderRadius:'10px', fontSize:'0.9rem', fontWeight:600, border:`2px solid ${sprintLength===n? 'var(--primary)':'var(--border)'}`, backgroundColor: sprintLength===n? 'rgba(232,100,60,0.08)':'transparent', color: sprintLength===n? 'var(--primary)':'var(--text-secondary)'}}>{n}Q</button>
          ))}
        </div>
        <button className='primary' onClick={()=> startSprint(sprintLength)} style={{ width:'100%', padding:'16px', fontSize:'1.05rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}><Zap size={18}/> Start {bucketLabel ? 'Drill' : 'My Focus Sprint'} · {sprintLength}Q</button>
        <div style={{ display:'flex', gap:'10px', marginTop:'10px'}}>
          <button onClick={()=> navigate('/my-drills')} style={{ flex:1, padding:'10px', color:'var(--text-secondary)'}}>Go to Drills →</button>
          <button onClick={()=> navigate('/')} style={{ flex:1, padding:'10px', color:'var(--text-secondary)'}}>Dashboard</button>
        </div>
        <div style={{ marginTop:'12px', fontSize:'0.72rem', color:'var(--text-secondary)', textAlign:'center'}}>Tip: 1-4 to pick, Enter to submit, H for hint.</div>
      </div>
    );
  }

  if (loading) return <div style={{ padding:'32px', display:'flex', alignItems:'center', gap:'10px', color:'var(--text-secondary)'}}><span style={{ width:'16px', height:'16px', borderRadius:'50%', border:'2px solid var(--primary)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style> Loading weighted question {questionNum}/{sprintLength}...</div>;
  if (!question) return <div style={{ padding:'32px', textAlign:'center'}}><AlertCircle size={28} color='var(--xp-gold)'/><p style={{ color:'var(--text-secondary)', marginTop:'10px'}}>Could not load question. <button className='primary' onClick={()=> fetchNextBatch(sprintLength, bucket)} style={{ marginLeft:'8px', padding:'8px 14px'}}>Retry</button></p></div>;

  const isCorrect = question.is_grid_in ? parseFloat(selectedChoice)===question.grid_in_answer : question.choices.find(c=>c.label===selectedChoice)?.is_correct;

  return (
    <div style={{ padding:'clamp(16px,5vw,48px)', maxWidth:'800px', margin:'0 auto', width:'100%', display:'flex', flexDirection:'column'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes correctPop{0%{transform:scale(1)}45%{transform:scale(1.02)}100%{transform:scale(1)}}`}</style>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px'}}>
        <span style={{ fontSize:'0.72rem', color:'var(--primary)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600, display:'flex', alignItems:'center', gap:'6px'}}><Zap size={13}/> {bucketLabel ? `Drill: ${bucketLabel}` : 'My Focus'} · Q{questionNum}/{sprintLength}</span>
        <span style={{ marginLeft:'auto', fontSize:'0.78rem', color: elapsed>90?'var(--error)': elapsed>60?'var(--xp-gold)':'var(--text-secondary)'}}><Clock size={12} style={{ verticalAlign:'-2px', marginRight:'4px'}}/>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</span>
      </div>
      <div style={{ display:'flex', gap:'4px', marginBottom:'14px'}}>
        {Array.from({length:sprintLength}).map((_,i)=> <div key={i} style={{ flex:1, height:'4px', borderRadius:'3px', backgroundColor: i<questionNum-1?'var(--primary)': i===questionNum-1?'rgba(232,100,60,0.35)':'var(--border)'}}/>)}
      </div>
      <TestToolbar toolbar={toolbar} mathOnly={question.section?.toLowerCase()==='math'} onOpenCalculator={()=> toolbar.setCalculatorOpen(true)} onOpenReference={()=> toolbar.setReferenceOpen(true)} />
      {toolbar.referenceOpen && <ReferenceSheet onClose={()=> toolbar.setReferenceOpen(false)} />}
      {toolbar.calculatorOpen && <DesmosCalculator onClose={()=> toolbar.setCalculatorOpen(false)} />}
      <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'14px', flexWrap:'wrap'}}>
        <span style={{ fontSize:'0.7rem', color:'var(--text-secondary)', textTransform:'uppercase'}}>{question.section}</span><span style={{ color:'var(--border)'}}>|</span><span style={{ fontSize:'0.7rem', color:'var(--primary)', textTransform:'uppercase'}}>{question.domain}</span><span style={{ color:'var(--border)'}}>|</span><span style={{ fontSize:'0.7rem', color:'var(--text-secondary)', textTransform:'uppercase'}}>{question.difficulty}</span>
      </div>
      <div ref={questionContentRef} onMouseUp={()=> { if (toolbar.highlightMode) applyHighlightToSelection(questionContentRef.current); }} style={{ display:'flex', flexDirection: window.innerWidth<768 && question.passage_text? 'column':'row', gap:'24px', marginBottom:'24px', fontSize: `${TEXT_SIZE_SCALE[toolbar.textSize]}em`}}>
        <QuestionMathContent question={question}/>
      </div>
      {hintsUsed>0 && <div style={{ backgroundColor:'rgba(255,215,64,0.06)', border:'1px solid rgba(255,215,64,0.25)', padding:'12px', borderRadius:'10px', marginBottom:'14px', fontSize:'0.9rem'}}><div style={{ fontWeight:600, color:'var(--xp-gold)', marginBottom:'4px'}}>Hint {hintsUsed}</div><MathText>{hintsUsed===1? question.hint_1 : question.hint_2}</MathText></div>}
      <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'18px'}}>
        {question.is_grid_in ? <input type='number' value={selectedChoice||''} onChange={e=> setSelectedChoice(e.target.value)} disabled={isAnswered} style={{ padding:'14px', fontSize:'1.1rem', borderRadius:'10px', border:'2px solid var(--border)', backgroundColor:'var(--bg-main)', color:'var(--text-primary)', maxWidth:'260px'}} placeholder='Enter answer'/> :
          question.choices.map(c=>{
            let bg='var(--bg-card)', bd='var(--border)';
            if (isAnswered) { if (c.is_correct) { bg='rgba(70,183,159,0.08)'; bd='var(--success)'; } else if (selectedChoice===c.label) { bg='rgba(255,82,82,0.08)'; bd='var(--error)'; } }
            else if (selectedChoice===c.label) { bg='rgba(232,100,60,0.07)'; bd='var(--primary)'; }
            const struck = toolbar.struckChoices.has(c.label);
            return (
              <div key={c.label} style={{ display:'flex', gap:'8px', alignItems:'center'}}>
                <StrikeToggle struck={struck} onToggle={()=> toolbar.toggleStrike(c.label)} />
                <button disabled={isAnswered} onClick={()=> setSelectedChoice(c.label)} style={{ flex:1, display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', backgroundColor:bg, border:`2px solid ${bd}`, borderRadius:'12px', textAlign:'left', opacity: struck?0.45:1, textDecoration: struck? 'line-through':'none', animation: isAnswered && c.is_correct? 'correctPop 0.3s ease':undefined}}>
                  <span style={{ width:'26px', height:'26px', borderRadius:'50%', backgroundColor: selectedChoice===c.label && !isAnswered? 'var(--primary)':'var(--border)', color: selectedChoice===c.label && !isAnswered? 'white':'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8rem', flexShrink:0}}>{c.label}</span>
                  <MathText style={{ flex:1}}>{c.text}</MathText>
                  {isAnswered && c.is_correct && <CheckCircle2 size={16} color='var(--success)'/>}
                  {isAnswered && selectedChoice===c.label && !c.is_correct && <XCircle size={16} color='var(--error)'/>}
                </button>
              </div>
            );
          })}
      </div>
      {isAnswered ? (
        <div>
          <div style={{ backgroundColor:'var(--bg-card)', padding:'16px', borderRadius:'12px', borderLeft:`4px solid ${isCorrect? 'var(--success)':'var(--primary)'}`, marginBottom:'10px'}}>
            <div style={{ fontSize:'0.78rem', color: isCorrect? 'var(--success)':'var(--primary)', textTransform:'uppercase', fontWeight:600, marginBottom:'6px'}}>{isCorrect? `Correct! +${DIFF_XP[question.difficulty]||20} XP` : 'Explanation'}</div>
            <div style={{ fontSize:'0.92rem', lineHeight:1.6}}><MathText>{question.explanation}</MathText></div>
          </div>
          <button className='primary' onClick={handleNext} style={{ width:'100%', padding:'14px', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px'}}>{questionNum>=sprintLength? 'Finish' : 'Next'} <ChevronRight size={16}/></button>
        </div>
      ) : (
        <div style={{ display:'flex', gap:'8px'}}>
          <button onClick={()=> setHintsUsed(h=> Math.min(h+1,2))} disabled={hintsUsed>=2} style={{ flex:1, padding:'12px', color: hintsUsed>=2? 'var(--text-secondary)':'var(--xp-gold)', borderColor: hintsUsed>=2? 'var(--border)':'rgba(255,215,64,0.3)'}}>Hint ({2-hintsUsed} left)</button>
          <button className='primary' onClick={handleAnswerSubmit} disabled={!selectedChoice} style={{ flex:2, padding:'12px'}}>Check Answer</button>
        </div>
      )}
    </div>
  );
}
