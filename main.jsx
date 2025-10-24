/* =========================  EconoLearn – FULL WORKING APP  ========================= */
const { useEffect, useMemo, useRef, useState } = React;
const { createPortal } = ReactDOM;

/* ----------------- LocalStorage helpers ----------------- */
const LS_KEY = "econ_mcq_history_v2";
const store = {
  get() { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};

/* ----------------- Time helpers (rule: 1.2 min per Q) ----------------- */
const TIME_PER_Q_MIN = 1.2;                               // minutes/Q
const timeForN = (n) => Math.round(n * TIME_PER_Q_MIN * 60); // seconds
const fmt = (s) => {                                    // HH:MM:SS or MM:SS
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ----------------- Small utils ----------------- */
const shuffle = (arr) => { const a = arr.slice(); for (let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]];} return a; };
const pickN = (arr, n) => shuffle(arr).slice(0, n);

/* ----------------- Background (Ganesh for phones) ----------------- */
const MobileGanesh = () => (
  <div className="md:hidden mx-auto mt-3 mb-2 w-28 h-28 opacity-30"
       style={{background:"url('./ganesh.png') no-repeat center/contain"}} />
);

/* ----------------- Buttons & cards ----------------- */
const glassCard = "relative overflow-hidden rounded-3xl p-6 bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_30px_60px_-40px_rgba(244,114,182,0.55)]";
const glassPanel= "rounded-[24px] p-[1px] bg-gradient-to-br from-rose-100 via-rose-50 to-rose-100";

/* ----------------- TopBar ----------------- */
const TopBar = ({ onHome, onHistory, onAnalytics, page }) => (
  <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-sm sm:text-base font-semibold">
        <span className="font-extrabold">EconoLearn</span>
        <span className="text-gray-500 font-semibold"> — CUET PG Economics</span>
      </h1>
      <nav className="flex items-center gap-2 text-sm">
        {page!=='history' && <button onClick={onHistory} className="px-3 py-1 rounded-lg bg-white shadow border">Review Past Results</button>}
        {page!=='analytics' && <button onClick={onAnalytics} className="px-3 py-1 rounded-lg bg-white shadow border">Analytics</button>}
        {page!=='home' && <button onClick={onHome} className="px-3 py-1 rounded-lg bg-white shadow border">Home</button>}
      </nav>
    </div>
  </header>
);

/* ----------------- FancySelect using a portal (never clipped) ----------------- */
function FancySelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);

  const toggle = () => {
    if (!btnRef.current) { setOpen(v=>!v); return; }
    const r = btnRef.current.getBoundingClientRect();
    setRect(r);
    const below = window.innerHeight - r.bottom;
    const estimated = Math.min(220, options.length*40 + 12);
    setPlacement(below >= estimated ? 'bottom' : 'top');
    setOpen(v=>!v);
  };

  useEffect(() => {
    const onDoc = (e) => { if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key==='Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}
        className="w-full text-left p-2 pr-9 border rounded-lg bg-white hover:bg-gray-50 transition relative">
        {value}<span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
      </button>

      {open && rect && createPortal(
        <ul
          className="fixed z-[9999] max-h-60 overflow-auto rounded-xl border bg-white/95 backdrop-blur shadow-xl"
          style={{
            left: rect.left, width: rect.width,
            top: placement==='bottom' ? (rect.bottom + 6) : (rect.top - Math.min(240, options.length*40) - 6)
          }}
          role="listbox"
        >
          {options.map(opt => (
            <li key={opt} role="option" aria-selected={opt===value}
                onClick={()=>{onChange(opt); setOpen(false);}}
                className={`px-3 py-2 cursor-pointer hover:bg-teal-50 ${opt===value?'bg-teal-100 text-teal-700 font-medium':''}`}>
              {opt}
            </li>
          ))}
        </ul>, document.body)}
    </>
  );
}

/* ====================================================================== */
const App = () => {
  const [page, setPage] = useState('home');    // home | quiz | result | history | analytics
  const [mode, setMode] = useState('practice');
  const [questions, setQuestions] = useState([]);
  const [activeSet, setActiveSet] = useState([]);
  const [chapter, setChapter] = useState('All');
  const [testCount, setTestCount] = useState(10);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [skipped, setSkipped] = useState({});
  const [remaining, setRemaining] = useState(0);
  const timer = useRef(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  useEffect(() => {
    fetch('questions.json?v=' + Date.now())
      .then(r => { if(!r.ok) throw new Error('bad'); return r.json(); })
      .then(d => Array.isArray(d) ? setQuestions(d) : setQuestions(d?.questions ?? []))
      .catch(()=> setErr('Could not load questions.json'))
      .finally(()=> setLoading(false));
  }, []);

  const total = activeSet.length;
  const attempted = useMemo(()=>Object.keys(answers).filter(k=>answers[k]!=null).length,[answers]);
  const score = useMemo(()=>activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[answers,activeSet]);

  const stopTimer = ()=>{ if (timer.current){ clearInterval(timer.current); timer.current=null; } };
  const startTimer = (sec)=>{ stopTimer(); setRemaining(sec);
    timer.current=setInterval(()=>{ setRemaining(p=>{ if(p<=1){ clearInterval(timer.current); setPage('result'); return 0; } return p-1; }); }, 1000);
  };

  const resetRun = ()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); };

  const startPractice = ()=>{ 
    const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter); 
    setActiveSet(s); resetRun(); stopTimer(); setPage('quiz'); 
  };

  const startTest = ()=>{ 
    const pool = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const requestedN = Math.max(1, parseInt(testCount || 1, 10));
    const n = Math.max(1, Math.min(requestedN, pool.length));
    const s = pickN(pool, n);
    setActiveSet(s); resetRun(); startTimer(timeForN(n)); setPage('quiz'); 
  };

  useEffect(() => {
    if (page !== 'result' || !total) return;
    const entry = {
      id: 'attempt_' + Date.now(),
      timestamp: new Date().toISOString(),
      mode, chapter, total, score,
      percent: total ? Math.round((score/total)*100) : 0,
      durationSec: mode==='test' ? timeForN(total) : null,
      answers: Array.from({length: total}, (_,i)=>answers[i] ?? null),
      questions: activeSet.map(q=>({chapter:q.chapter, question:q.question, options:q.options, answer:q.answer, source:q.source ?? null}))
    };
    const h = store.get(); h.unshift(entry); store.set(h.slice(0,60));
  }, [page, total, score, answers, activeSet, mode, chapter]);

  /* ----------------- Loading / Error ----------------- */
  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Loading questions…</div>;
  if (err)      return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-red-600">{err}</div>;

  /* ----------------- HOME ----------------- */
  if (page==='home') {
    const chapterList = ['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))];
    const filteredCount = chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const requestedN = Math.max(1, parseInt(testCount || 1, 10));
    const effectiveN = Math.min(requestedN, filteredCount || 1);
    const est = timeForN(effectiveN);

    return (
      <>
        <TopBar page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4">
          <h2 className="mt-6 text-4xl font-extrabold text-rose-400 text-center">EconoLearn</h2>
          <MobileGanesh />
          <section className="mt-4 sm:mt-6 flex justify-center animate-[rise_.35s_ease]">
            <div className={`${glassPanel}`}>
              <div className={`${glassCard} w-[92vw] max-w-4xl`}>
                <h3 className="text-2xl sm:text-3xl font-extrabold">MCQ Practice for CUET PG Economics</h3>
                <p className="text-gray-600 mt-1">Practice chapter-wise Economics PYQs with instant feedback.</p>

                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700">Chapter Filter</label>
                    <FancySelect value={chapter} onChange={setChapter} options={chapterList} />
                  </div>

                  <div>
                    <label className="text-sm text-gray-700">Mode</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2"><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} /> Practice</label>
                      <label className="flex items-center gap-2"><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')} /> Test</label>
                    </div>
                  </div>
                </div>

                {mode==='test' && (
                  <div className="mt-4 grid sm:grid-cols-3 items-end gap-4">
                    <div>
                      <label className="text-sm text-gray-700 block">No. of Questions</label>
                      <input type="number" min="1" max={filteredCount} value={testCount}
                             onChange={e=>setTestCount(e.target.value)}
                             className="w-28 p-2 border rounded bg-white" />
                      <div className="text-xs text-gray-600 mt-1">
                        Available: {filteredCount}
                        {requestedN > filteredCount && <span className="ml-1 text-rose-600">(Requested {requestedN}, using {effectiveN})</span>}
                      </div>
                    </div>
                    <div className="sm:col-start-3 sm:justify-self-end">
                      <label className="text-sm text-gray-700 block">Time limit</label>
                      <div className="p-2 border rounded bg-white text-sm w-28 text-center">{fmt(est)}</div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex gap-3 flex-wrap">
                  {mode==='practice'
                    ? <button onClick={startPractice} className="px-4 py-2 rounded-lg bg-teal-600 text-white shadow hover:bg-teal-700">Start Practice</button>
                    : <button onClick={startTest} className="px-4 py-2 rounded-lg bg-teal-600 text-white shadow hover:bg-teal-700">Start Test</button>
                  }
                  <button onClick={()=>setPage('history')} className="px-4 py-2 rounded-lg bg-white border shadow">Review Past Results</button>
                  <button onClick={()=>setPage('analytics')} className="px-4 py-2 rounded-lg bg-white border shadow">Analytics</button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* ----------------- QUIZ ----------------- */
  if (page==='quiz') {
    const q = activeSet[current]; if (!q) return null;
    const unattempted = Math.max(0, activeSet.length - attempted);

    return (
      <>
        <TopBar page={page} onHome={()=>{ stopTimer(); setPage('home'); }} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,260px] gap-6">
            <div>
              <div className="mb-3 text-sm text-gray-600">Question {current+1} of {activeSet.length}</div>
              <div className={`${glassPanel}`}><div className={`${glassCard}`}>
                <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Chapter</div>
                <div className="mb-3 text-base font-medium">{q.chapter || '—'}</div>

                <h4 className="text-lg font-semibold">{q.question}</h4>
                {q.source && <div className="text-xs text-gray-600 mt-1">Source: {q.source}</div>}

                <div className="mt-5 grid gap-3">
                  {q.options.map((opt, idx) => {
                    const active = answers[current] === opt;
                    return (
                      <label key={idx}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition bg-white hover:bg-gray-50 ${active?'border-teal-500 ring-1 ring-teal-300':'border-gray-200'}`}>
                        <input type="radio" name={`q-${current}`} className="accent-teal-600"
                               checked={active}
                               onChange={()=>{ setAnswers(p=>({...p,[current]:opt})); setSkipped(p=>{const c={...p}; delete c[current]; return c;}); }} />
                        <span className="font-medium">{String.fromCharCode(65+idx)}.</span>
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button onClick={()=>setCurrent(c=>Math.max(0,c-1))}
                          disabled={current===0}
                          className="px-3 py-2 rounded bg-white border shadow disabled:opacity-50">Previous</button>
                  <button onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})}
                          className="px-3 py-2 rounded bg-white border shadow">Clear</button>
                  <button onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))}
                          className={`px-3 py-2 rounded border shadow ${marked[current]?'bg-violet-500 text-white border-violet-600':'bg-white'}`}>
                    {marked[current] ? 'Unmark' : 'Mark for Review'}
                  </button>
                  <div className="flex-1" />
                  <div className="text-sm text-gray-700 mr-2">Attempted: <b>{attempted}</b> • Unattempted: <b>{unattempted}</b></div>
                  {current < activeSet.length-1 ? (
                    <button onClick={()=>setCurrent(c=>c+1)} className="px-4 py-2 rounded bg-teal-600 text-white shadow">Next</button>
                  ) : (
                    <button onClick={()=>{ stopTimer(); setPage('result'); }} className="px-4 py-2 rounded bg-green-600 text-white shadow">Submit</button>
                  )}
                </div>
              </div></div>
            </div>

            {/* Right palette */}
            <aside className="lg:sticky lg:top-[72px]">
              <div className="rounded-2xl p-4 bg-white/80 backdrop-blur border shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Question Palette</h4>
                  {mode==='test' && <span className={`text-xs px-2 py-1 rounded border ${remaining<=30?'border-red-500 text-red-600':'border-gray-300 text-gray-700'}`}>⏱ {fmt(remaining)}</span>}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_,i)=>{
                    const answered = answers[i]!=null; const isMarked = !!marked[i]; const isSkipped = !!skipped[i];
                    const s = answered && isMarked ? 'attempted_marked' : !answered && isMarked ? 'marked_only' : !answered && isSkipped ? 'skipped' : answered ? 'attempted' : 'unattempted';
                    const color = s==='attempted_marked' ? "bg-blue-500 text-white"
                               : s==='marked_only'     ? "bg-violet-500 text-white"
                               : s==='skipped'         ? "bg-red-500 text-white"
                               : s==='attempted'       ? "bg-green-500 text-white"
                                                       : "bg-white";
                    return <button key={i} onClick={()=>setCurrent(i)} className={`w-8 h-8 rounded-md border shadow text-sm ${color}`}>{i+1}</button>;
                  })}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </>
    );
  }

  /* ----------------- RESULT ----------------- */
  if (page==='result') {
    const percent = total?Math.round(score/total*100):0;
    return (
      <>
        <TopBar page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className={`${glassPanel}`}><div className={`${glassCard}`}>
            <h3 className="text-xl font-semibold">Result</h3>
            <p className="mt-1">Score : {score}/{total} ({percent}%)</p>

            <div className="space-y-3 mt-3">
              {activeSet.map((qq,i)=>{
                const sel=answers[i]; const ok=sel===qq.answer;
                return (
                  <div key={i} className="p-3 border rounded bg-white">
                    <div className="flex justify-between">
                      <b>Q{i+1}. {qq.question}</b>
                      <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{ok?'Correct':'Incorrect'}</span>
                    </div>
                    <p className="text-sm mt-1">Your: {sel||'Not answered'} • Correct: <b className="text-green-700">{qq.answer}</b></p>
                    {qq.explanation && <p className="text-sm text-gray-700 mt-1">{qq.explanation}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-4"><button onClick={()=>setPage('home')} className="px-3 py-2 rounded bg-white border shadow">Home</button></div>
          </div></div>
        </main>
      </>
    );
  }

  /* ----------------- HISTORY ----------------- */
  if (page==='history') {
    const h = store.get();
    const sorted = [...h].sort((a,b)=>{
      if (sortBy==='date_desc') return new Date(b.timestamp) - new Date(a.timestamp);
      if (sortBy==='date_asc')  return new Date(a.timestamp) - new Date(b.timestamp);
      if (sortBy==='score_desc') return (b.percent||0) - (a.percent||0);
      if (sortBy==='score_asc')  return (a.percent||0) - (b.percent||0);
      return 0;
    });

    return (
      <>
        <TopBar page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Past Results</h2>
            <select className="border rounded px-2 py-1" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="score_desc">Score high → low</option>
              <option value="score_asc">Score low → high</option>
            </select>
          </div>
          {sorted.length===0 ? (
            <div className="text-gray-500">No attempts yet.</div>
          ) : (
            <div className="space-y-4">
              {sorted.map(a=>(
                <details key={a.id} className={`${glassPanel}`} open={false}>
                  <summary className={`${glassCard} cursor-pointer`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                        <div className="text-sm text-gray-700">Score: {a.score}/{a.total} ({a.percent}%) {a.durationSec?`• Time: ${fmt(a.durationSec)}`:''}</div>
                      </div>
                    </div>
                  </summary>
                  <div className="p-4 bg-white rounded-b-3xl">
                    {a.questions.map((q,i)=>{
                      const your=a.answers[i]; const ok=your===q.answer;
                      return (
                        <div key={i} className="p-3 border rounded mb-2 bg-white">
                          <div className="flex justify-between">
                            <b>Q{i+1}. {q.question}</b>
                            <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{ok?'Correct':'Incorrect'}</span>
                          </div>
                          <div className="text-sm text-gray-700">Chapter: {q.chapter || '—'} • Source: {q.source || '—'}</div>
                          <div className="text-sm">Your: {your || 'Not answered'} • Correct: <b className="text-green-700">{q.answer}</b></div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </main>
      </>
    );
  }

  /* ----------------- ANALYTICS ----------------- */
  if (page==='analytics') {
    const hist = store.get();
    const agg = {};
    hist.forEach(at => at.questions.forEach((q,i)=>{
      const ch=q.chapter||'Unknown'; if(!agg[ch]) agg[ch]={correct:0,total:0};
      agg[ch].total++; if(at.answers[i]===q.answer) agg[ch].correct++;
    }));
    const rows = Object.entries(agg).map(([ch,{correct,total}])=>({ch,correct,total,pct: total?Math.round(correct/total*100):0}))
                                   .sort((a,b)=>a.ch.localeCompare(b.ch));

    return (
      <>
        <TopBar page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-xl font-semibold mb-4">Chapter-wise Analytics</h2>
          {rows.length===0 ? <div className="text-gray-500">No data yet.</div> : (
            <div className="space-y-3">
              {rows.map(r=>(
                <div key={r.ch} className={`${glassPanel}`}><div className={`${glassCard}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{r.ch}</div>
                    <div className="text-sm text-gray-700">{r.correct}/{r.total} correct • {r.pct}%</div>
                  </div>
                  <div className="mt-2 h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{width:`${r.pct}%`}} />
                  </div>
                </div></div>
              ))}
            </div>
          )}
        </main>
      </>
    );
  }

  return null;
};
/* ====================================================================== */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);