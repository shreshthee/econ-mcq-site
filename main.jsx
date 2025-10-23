/* ===================== EconoLearn - main.jsx (browser-safe, with FancySelect) ===================== */
const { useEffect, useMemo, useRef, useState } = React;

/* ----------------- LocalStorage helpers ----------------- */
const LS_KEY = "econ_mcq_history_v2";
const store = {
  get() { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};

/* ----------------- Time helpers (rule: 1.2 min per Q) ----------------- */
const TIME_PER_Q_MIN = 1.2;                               // 1.2 minutes per question
const timeForN = (n) => Math.round(n * TIME_PER_Q_MIN * 60); // seconds
const fmt = (s) => {                                     // HH:MM:SS (or MM:SS if < 1 hour)
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ----------------- Small utils ----------------- */
const shuffle = (arr) => { const a = arr.slice(); for (let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]];} return a; };
const pickN   = (arr, n) => shuffle(arr).slice(0, n);

/* ----------------- Background ----------------- */
const Background = () => (
  <>
    <div className="pointer-events-none fixed left-0 top-1/2 -translate-y-1/2
                    w-[45vmin] h-[60vmin] sm:w-[40vmin] sm:h-[55vmin]
                    bg-[url('./ganesh.png')] bg-no-repeat bg-contain bg-left
                    opacity-25 rounded-[999px]" />
    <div className="fixed inset-0 -z-10 bg-rose-50/10" />
  </>
);

/* ----------------- UI helpers ----------------- */
const glassCard = "relative overflow-hidden rounded-3xl p-6 bg-white/30 backdrop-blur-xl border border-white/40";
const cardWrap  = "relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-200/70 via-red-200/60 to-rose-200/70 shadow-lg shadow-red-200/40";
const glassBtn  = (extra="") => `px-4 py-2 rounded-lg border border-white/40 bg-white/30 hover:bg-white/40
                                  text-gray-800 backdrop-blur-xl transition shadow-sm hover:shadow
                                  transform-gpu hover:scale-[1.03] active:scale-[0.99] ${extra}`;
const solidBtn  = (extra="") => `px-5 py-2 rounded-lg text-white shadow-md transform-gpu hover:scale-[1.03] active:scale-[0.99] ${extra}`;

/* ----------------- FancySelect (glassy, animated, cross-browser) ----------------- */
function FancySelect({ options = [], value, onChange, label = 'Select' }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.findIndex(o => o === value)));
  const btnRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!btnRef.current || !listRef.current) return;
      if (!btnRef.current.contains(e.target) && !listRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') setActiveIndex(i => Math.min(options.length-1, i+1));
    else if (e.key === 'ArrowUp')   setActiveIndex(i => Math.max(0, i-1));
    else if (e.key === 'Enter')     { const choice = options[activeIndex]; onChange?.(choice); setOpen(false); }
  };

  return (
    <div className="relative w-full" onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   border border-white/60 bg-white/60 backdrop-blur
                   text-left shadow-sm hover:bg-white/70 transition"
      >
        <span className="truncate">{value ?? label}</span>
        <svg className={`w-5 h-5 text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}
             viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd" />
        </svg>
      </button>

      <div
        ref={listRef}
        role="listbox"
        className={`absolute z-20 mt-2 w-full rounded-2xl border border-white/50
                    bg-white/80 backdrop-blur-xl shadow-xl overflow-hidden
                    transform transition-all duration-200 origin-top
                    ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        <ul className="max-h-64 overflow-auto p-1">
          {options.map((opt, idx) => {
            const selected = opt === value;
            const active   = idx === activeIndex;
            return (
              <li key={opt} role="option" aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => { onChange?.(opt); setOpen(false); }}
                  className={`px-4 py-3 rounded-xl cursor-pointer transition-colors select-none
                              ${selected ? 'bg-teal-500/90 text-white'
                               : active  ? 'bg-gray-200/70'
                                         : 'hover:bg-gray-100/80'}`}>
                <div className="font-medium leading-snug">{opt}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ----------------- TopBar ----------------- */
const TopBar = ({ onHome, onHistory, onAnalytics, page, mode, timeLeft }) => (
  <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-base md:text-lg font-semibold">EconoLearn – CUET PG Economics</h1>
      <div className="flex items-center gap-2 md:gap-3 text-sm">
        {page==='home' && (
          <>
            <button onClick={onHistory}   className={glassBtn()}>Review Past Results</button>
            <button onClick={onAnalytics} className={glassBtn()}>Analytics</button>
          </>
        )}
        {page==='quiz' && mode==='test' && (
          <span className={`px-2 py-1 rounded border ${timeLeft<=30?'border-red-500 text-red-600':'border-gray-300 text-gray-700'}`}>⏱ {fmt(timeLeft)}</span>
        )}
        {page!=='home' && <button onClick={onHome} className={glassBtn()}>Home</button>}
      </div>
    </div>
  </header>
);

/* ----------------- Progress ----------------- */
const Progress = ({ i, total }) => {
  const pct = total ? Math.round(((i+1)/total)*100) : 0;
  return (
    <div className="w-full bg-white/40 backdrop-blur h-2 rounded-full shadow-inner">
      <div className="bg-teal-500 h-2 rounded-full transition-all" style={{width:`${pct}%`}} />
    </div>
  );
};

/* ====================================================================== */
const App = () => {
  const [page, setPage] = useState('home');           // home | quiz | result | history | analytics
  const [mode, setMode] = useState('practice');       // practice | test
  const [questions, setQuestions] = useState([]);
  const [activeSet, setActiveSet] = useState([]);
  const [chapter, setChapter] = useState('All');
  const [testCount, setTestCount] = useState(10);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  the [marked, setMarked] = useState({});
  const [skipped, setSkipped] = useState({});

  const [remaining, setRemaining] = useState(0);
  const timer = React.useRef(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  /* ---- load questions.json ---- */
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

  const startPractice = ()=>{ const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter); setActiveSet(s); resetRun(); stopTimer(); setPage('quiz'); };
  const startTest = ()=>{ const pool = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const req = Math.max(1, parseInt(testCount||1,10));
    const n = Math.max(1, Math.min(req, pool.length));
    const s = pickN(pool, n);
    setActiveSet(s); resetRun(); startTimer(timeForN(n)); setPage('quiz'); };

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
    const h = store.get(); h.unshift(entry); store.set(h.slice(0,50));
  }, [page, total, score, answers, activeSet, mode, chapter]);

  if (loading) return <main className="p-8 text-center">Loading…</main>;
  if (err)      return <main className="p-8 text-center text-red-600">{err}</main>;

  /* ---- HOME ---- */
  if (page==='home') {
    const filteredCount = chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const requestedN = Math.max(1, parseInt(testCount || 1, 10));
    const effectiveN = Math.min(requestedN, filteredCount || 1);
    const est = timeForN(effectiveN);

    const chapterOptions = ['All', ...new Set(questions.map(q=>q.chapter).filter(Boolean))];

    return (
      <>
        <TopBar page={page} mode={mode} timeLeft={remaining}
                onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <Background/>
        <main className="relative max-w-6xl mx-auto px-4 py-10">
          <section className={cardWrap}>
            <div className={glassCard}>
              <h2 className="text-3xl font-semibold">EconoLearn – MCQ Practice for CUET PG Economics</h2>
              <p className="text-gray-700 mt-2">Practice chapter-wise Economics PYQs with instant feedback.</p>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm mb-1 block">Chapter Filter</label>
                  <FancySelect label="Chapter" value={chapter} onChange={setChapter} options={chapterOptions} />
                </div>
                <div>
                  <label className="text-sm mb-1 block">Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} /> Practice</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')} /> Test</label>
                  </div>
                </div>
              </div>

              {mode==='test' && (
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">No. of Questions</label>
                    <input type="number" min="1" max={filteredCount} value={testCount}
                           onChange={e=>setTestCount(e.target.value)}
                           className="w-full p-2 border rounded-lg bg-white/60 backdrop-blur" />
                    <p className="text-xs text-gray-700 mt-1">Available: {filteredCount}</p>
                  </div>
                  <div className="flex items-end">
                    <div className="p-2 border rounded bg-white/60 backdrop-blur text-sm">
                      Estimated Time : {fmt(est)}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3 flex-wrap">
                {mode==='practice'
                  ? <button onClick={startPractice} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Start Practice</button>
                  : <button onClick={startTest} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Start Test</button>}
                <button onClick={()=>setPage('history')} className={glassBtn()}>Review Past Results</button>
                <button onClick={()=>setPage('analytics')} className={glassBtn()}>Analytics</button>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* ---- QUIZ ---- */
  if (page==='quiz') {
    const q = activeSet[current]; if (!q) return null;

    return (
      <>
        <TopBar page={page} mode={mode} timeLeft={remaining}
                onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,280px] gap-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600">Question {current+1} of {activeSet.length}</div>
                <div className="w-1/2"><Progress i={current} total={activeSet.length}/></div>
              </div>

              <section className={cardWrap}>
                <div className={glassCard}>
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-700">Chapter</div>
                  <div className="mb-4 text-base font-medium">{q.chapter || '—'}</div>

                  <h3 className="text-lg font-semibold leading-relaxed">{q.question}</h3>
                  {q.source && <div className="mt-1 text-xs text-gray-700">Source: {q.source}</div>}

                  <div className="mt-5 grid gap-3">
                    {q.options.map((opt, idx) => {
                      const active = answers[current] === opt;
                      return (
                        <label key={idx}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition
                                      bg-white/50 backdrop-blur hover:bg-white/70
                                      ${active?'border-teal-500 ring-1 ring-teal-300':'border-white/50'}`}>
                          <input type="radio" name={`q-${current}`} className="accent-teal-500"
                                 checked={active}
                                 onChange={()=> setAnswers(p=>({...p,[current]:opt})) } />
                          <span className="font-medium">{String.fromCharCode(65+idx)}.</span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button onClick={()=>setCurrent(c=>Math.max(0,c-1))} disabled={current===0}
                            className={glassBtn("disabled:opacity-50")}>Previous</button>
                    <button onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})}
                            className={glassBtn()}>Clear Response</button>
                    <button onClick={()=>setCurrent(c=>Math.min(activeSet.length-1,c+1))}
                            className={solidBtn("bg-teal-600 hover:bg-teal-700 ml-auto")}>
                      {current<activeSet.length-1 ? 'Next' : 'Submit'}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Palette */}
            <aside className="lg:sticky lg:top-[72px]">
              <div className="rounded-2xl p-4 bg-white/70 backdrop-blur border border-white/60 shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Question Palette</h4>
                  {mode==='test' && <span className={`text-xs px-2 py-1 rounded border ${remaining<=30?'border-red-500 text-red-600':'border-gray-300 text-gray-700'}`}>⏱ {fmt(remaining)}</span>}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_,i)=>{
                    const answered = answers[i]!=null;
                    const base="w-8 h-8 rounded-md flex items-center justify-center text-sm border shadow-sm";
                    const ring=(i===current)?" ring-2 ring-teal-500":"";
                    const color = answered ? "bg-[#32CD32] text-white border-green-600 hover:brightness-95"
                                           : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100 hover:text-teal-600";
                    return <button key={i} onClick={()=>setCurrent(i)} className={`${base} ${color} ${ring}`}>{i+1}</button>;
                  })}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </>
    );
  }

  /* ---- RESULT ---- */
  if (page==='result') {
    const total = activeSet.length;
    const score = activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0);
    const percent = total?Math.round(score/total*100):0;
    return (
      <>
        <TopBar page={page} mode={mode} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <Background/>
        <main className="relative max-w-6xl mx-auto px-4 py-8">
          <section className={cardWrap}>
            <div className={glassCard}>
              <h2 className="text-xl font-semibold">Result</h2>
              <p className="mt-1">Score : {score}/{total} ({percent}%)</p>
              <div className="mt-4"><button onClick={()=>setPage('home')} className={glassBtn()}>Home</button></div>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* ---- HISTORY ---- */
  if (page==='history') {
    const h = store.get();
    return (
      <>
        <TopBar page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-xl font-semibold mb-4">Past Results</h2>
          {h.length===0 ? <div className="text-gray-500">No attempts yet.</div> : (
            <div className="space-y-3">
              {h.map(a=>(
                <div key={a.id} className="p-3 border rounded bg-white/70 backdrop-blur">
                  <div className="font-semibold">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                  <div className="text-sm text-gray-700">Score: {a.score}/{a.total} ({a.percent}%)</div>
                </div>
              ))}
            </div>
          )}
        </main>
      </>
    );
  }

  /* ---- ANALYTICS (very simple) ---- */
  if (page==='analytics') {
    const hist = store.get();
    const agg = {};
    hist.forEach(at => at.questions?.forEach((q,i)=>{
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
                <div key={r.ch} className="p-3 border rounded-xl bg-white/70 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{r.ch}</div>
                    <div className="text-sm text-gray-700">{r.correct}/{r.total} correct • {r.pct}%</div>
                  </div>
                  <div className="mt-2 h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{width:`${r.pct}%`}}/>
                  </div>
                </div>
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
