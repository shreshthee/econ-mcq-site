/* ===================== EconoLearn - main.jsx (Hero + Alignments + Analytics robust) ===================== */
const { useEffect, useRef, useState } = React;

/* ----------------- LocalStorage helpers ----------------- */
const LS_KEY = "econ_mcq_history_v2";
const store = {
  get() { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};

/* ----------------- Time helpers (rule: 1.2 min per Q) ----------------- */
const TIME_PER_Q_MIN = 1.2;                              // 1.2 minutes per question
const timeForN = (n) => Math.round(n * TIME_PER_Q_MIN * 60); // seconds
const fmt = (s) => {                                    // HH:MM:SS (or MM:SS if < 1 hour)
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

/* ----------------- Background (Ganesh left, moved up) ----------------- */
const Background = () => (
  <>
    {/* moved upward: top-[38%] instead of top-1/2 */}
    <div className="pointer-events-none fixed left-0 top-[38%] -translate-y-1/2
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

/* ----------------- Confetti (on high score) ----------------- */
const Confetti = ({ on }) => {
  useEffect(() => {
    if (!on) return;
    const c = document.createElement('canvas'); c.style.position='fixed'; c.style.inset='0'; c.style.pointerEvents='none'; c.style.zIndex=9999;
    document.body.appendChild(c);
    const ctx=c.getContext('2d'); const resize=()=>{c.width=innerWidth; c.height=innerHeight;}; resize(); addEventListener('resize',resize);
    const colors=["#14b8a6","#f43f5e","#60a5fa","#a78bfa","#22c55e","#f59e0b"];
    const N=Math.min(240, ((c.width+c.height)/6)|0); const G=0.12, D=0.985, cx=c.width/2, cy=c.height*0.15;
    const p=Array.from({length:N}).map(()=>{const ang=Math.random()*Math.PI-Math.PI/2, sp=6+Math.random()*8;
      return {x:cx+(Math.random()*80-40), y:cy+(Math.random()*20-10), vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp-2,
              s:2+Math.random()*4, r:Math.random()*Math.PI*2, vr:(Math.random()-0.5)*0.2, col:colors[(Math.random()*colors.length)|0], life:0, ttl:250+Math.random()*100};});
    let raf=0, frame=0;
    const tick=()=>{frame++; ctx.clearRect(0,0,c.width,c.height);
      p.forEach(o=>{o.vx*=D; o.vy=o.vy*D+G; o.x+=o.vx; o.y+=o.vy; o.r+=o.vr; o.life++;
        const a=Math.max(0,1-o.life/o.ttl); ctx.globalAlpha=a; ctx.save(); ctx.translate(o.x,o.y); ctx.rotate(o.r);
        ctx.fillStyle=o.col; ctx.fillRect(-o.s,-o.s*0.5,o.s*2,o.s); ctx.restore(); ctx.globalAlpha=1;});
      if(frame<600) raf=requestAnimationFrame(tick); else cleanup(); };
    const cleanup=()=>{cancelAnimationFrame(raf); removeEventListener('resize',resize); c.remove();};
    raf=requestAnimationFrame(tick); return cleanup;
  },[on]);
  return null;
};

/* ----------------- TopBar (bigger, 2-tone title) ----------------- */
const TopBar = ({ onHome, onHistory, onAnalytics, page, mode, timeLeft }) => (
  <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl md:text-2xl font-semibold">
        <span className="font-extrabold text-gray-900">EconoLearn</span>
        <span className="text-gray-500 font-semibold"> — CUET PG Economics</span>
      </h1>
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

/* ----------------- Hero title in the empty space ----------------- */
const HeroTitle = () => (
  <div className="max-w-6xl mx-auto px-4">
    <div className="h-8 sm:h-10" />
    <h2 className="text-center text-4xl sm:text-5xl font-extrabold tracking-tight text-rose-300/90 select-none">
      EconoLearn
    </h2>
    <div className="h-6 sm:h-8" />
  </div>
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

/* ----------------- FancySelect with Portal (scroll + auto flip) ----------------- */
function FancySelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom'); // 'bottom' | 'top'
  const btnRef = useRef(null);
  const portalRef = useRef(null);

  useEffect(() => {
    portalRef.current = document.createElement('div');
    portalRef.current.style.position = 'fixed';
    portalRef.current.style.zIndex = 9999;
    document.body.appendChild(portalRef.current);

    const onDoc = (e) => {
      if (!btnRef.current) return;
      if (!btnRef.current.contains(e.target) && !portalRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      if (portalRef.current) document.body.removeChild(portalRef.current);
    };
  }, []);

  const toggle = () => {
    if (!btnRef.current || !portalRef.current) { setOpen(v => !v); return; }
    const r = btnRef.current.getBoundingClientRect();
    const menuH = Math.min(48 * Math.min(options.length, 8) + 8, 280); // approx
    const below = window.innerHeight - r.bottom;
    setPlacement(below >= menuH ? 'bottom' : 'top');

    // position portal
    const top = placement === 'bottom' ? r.bottom + 6 : r.top - menuH - 6;
    portalRef.current.style.left = `${r.left}px`;
    portalRef.current.style.width = `${r.width}px`;
    portalRef.current.style.top = `${Math.max(8, top)}px`;

    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open || !btnRef.current || !portalRef.current) return;
    const update = () => {
      const r = btnRef.current.getBoundingClientRect();
      const menuH = Math.min(48 * Math.min(options.length, 8) + 8, 280);
      const below = window.innerHeight - r.bottom;
      const place = below >= menuH ? 'bottom' : 'top';
      setPlacement(place);
      const top = place === 'bottom' ? r.bottom + 6 : r.top - menuH - 6;
      portalRef.current.style.left = `${r.left}px`;
      portalRef.current.style.width = `${r.width}px`;
      portalRef.current.style.top = `${Math.max(8, top)}px`;
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update, true);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update, true);
    };
  }, [open, options.length]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="w-full text-left p-2 pr-9 border rounded-lg bg-white/60 backdrop-blur hover:bg-white/70 transition"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
      </button>

      {open && portalRef.current && ReactDOM.createPortal(
        <ul className="max-h-56 overflow-auto rounded-xl border bg-white/95 backdrop-blur shadow-2xl" role="listbox">
          {options.map(opt => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer hover:bg-teal-50 ${opt===value?'bg-teal-100 text-teal-700 font-medium':''}`}
            >
              {opt}
            </li>
          ))}
        </ul>, portalRef.current
      )}
    </>
  );
}

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
  const score = activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0);

  const stopTimer = ()=>{ if (timer.current){ clearInterval(timer.current); timer.current=null; } };
  const startTimer = (sec)=>{ stopTimer(); setRemaining(sec);
    timer.current=setInterval(()=>{ setRemaining(p=>{ if(p<=1){ clearInterval(timer.current); setPage('result'); return 0; } return p-1; }); }, 1000);
  };

  const resetRun = ()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); };
  const startPractice = ()=>{ const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter); setActiveSet(s); resetRun(); stopTimer(); setPage('quiz'); };

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
    const h = store.get(); h.unshift(entry); store.set(h.slice(0,50));
  }, [page]); // stable deps to avoid hook order change

  if (loading) {
    return (<>
      <TopBar page={page} mode={mode} timeLeft={remaining} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <main className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">Loading questions…</main>
    </>);
  }
  if (err) {
    return (<>
      <TopBar page={page} mode={mode} timeLeft={remaining} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <main className="max-w-6xl mx-auto px-4 py-10 text-center text-red-600">{err}</main>
    </>);
  }

  /* ----------------- HOME ----------------- */
  if (page==='home') {
    const chapterList = ['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))];
    const filteredCount = chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const requestedN = Math.max(1, parseInt(testCount || 1, 10));
    const effectiveN = Math.min(requestedN, filteredCount || 1);
    const est = timeForN(effectiveN);

    return (
      <>
        <TopBar page={page} mode={mode} timeLeft={remaining}
                onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <Background/>

        {/* NEW hero title area to use the space */}
        <HeroTitle />

        <main className="relative max-w-6xl mx-auto px-4">
          {/* push card a bit down */}
          <section className={`${cardWrap} mt-2 mb-10`}>
            <div className={`${glassCard} max-w-5xl`}>
              <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 bg-white/20 rounded-full blur-3xl"></div>

              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                EconoLearn <span className="font-semibold text-gray-500">— MCQ Practice for CUET PG Economics</span>
              </h2>
              <p className="text-gray-700 mt-2">Practice chapter-wise Economics PYQs with instant feedback.</p>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Chapter Filter</label>
                  <FancySelect value={chapter} onChange={setChapter} options={chapterList} />
                </div>
                <div>
                  <label className="text-sm">Mode</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} /> Practice
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={mode==='test'} onChange={()=>setMode('test')} /> Test
                    </label>
                  </div>
                </div>
              </div>

              {mode==='test' && (
                /* aligned row: smaller boxes + right aligned time */
                <div className="mt-5 grid md:grid-cols-[auto_1fr_auto] md:items-end gap-6">
                  <div>
                    <label className="text-sm">No. of Questions</label>
                    <input
                      type="number"
                      min="1"
                      max={filteredCount}
                      value={testCount}
                      onChange={e=>setTestCount(e.target.value)}
                      className="w-28 p-2 border rounded-lg bg-white/60 backdrop-blur"
                    />
                    <p className="text-xs text-gray-700 mt-1">
                      Available: {filteredCount}
                      {requestedN > filteredCount && (
                        <span className="ml-2 text-rose-600 font-medium">
                          (Requested {requestedN}, using {effectiveN})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="hidden md:block" /> {/* spacer column on desktop */}

                  <div className="justify-self-end">
                    <label className="text-sm block text-right">Time limit</label>
                    <div className="p-2 border rounded bg-white/60 backdrop-blur text-sm w-28 text-center">
                      {fmt(est)}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3 flex-wrap">
                {mode==='practice' ? (
                  <button onClick={startPractice} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>
                    Start Practice
                  </button>
                ) : (
                  <button onClick={startTest} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>
                    Start Test
                  </button>
                )}
                <button onClick={()=>setPage('history')} className={glassBtn()}>Review Past Results</button>
                <button onClick={()=>setPage('analytics')} className={glassBtn()}>Analytics</button>
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
    const attemptedCount = Object.keys(answers).filter(k => answers[k] != null).length;
    const unattemptedCount = Math.max(0, activeSet.length - attemptedCount);

    return (
      <>
        <TopBar page={page} mode={mode} timeLeft={remaining}
                onHome={()=>{ stopTimer(); setPage('home'); }} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,280px] gap-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600">Question {current+1} of {activeSet.length}</div>
                <div className="w-1/2"><Progress i={current} total={activeSet.length}/></div>
              </div>

              <section className={cardWrap}>
                <div className={`${glassCard} animate-[slide_.35s_ease_both]`}>
                  <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 bg-white/20 rounded-full blur-3xl"></div>

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
                                 onChange={()=>{ setAnswers(p=>({...p,[current]:opt})); setSkipped(p=>{const c={...p}; delete c[current]; return c;}); }} />
                          <span className="font-medium">{String.fromCharCode(65+idx)}.</span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={()=>{ if(!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>Math.max(0,c-1)); }} disabled={current===0} className={glassBtn("disabled:opacity-50")}>Previous</button>
                      <button onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})} className={glassBtn()}>Clear Response</button>
                      <button onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))}
                              className={glassBtn(answers[current]? (marked[current]?" bg-blue-500/80 text-white border-blue-300 hover:bg-blue-600/80":"")
                                                      : (marked[current]?" bg-violet-500/80 text-white border-violet-300 hover:bg-violet-600/80":""))}>
                        {marked[current] ? 'Unmark Review' : 'Mark for Review'}
                      </button>
                    </div>

                    <div className="flex-1" />
                    <div className="flex items-center gap-4">
                      <div className="text-[13px] text-gray-700 text-right leading-tight">
                        <div>Attempted: <b>{attemptedCount}</b></div>
                        <div className="mt-1">Unattempted: <b>{unattemptedCount}</b></div>
                      </div>
                      {current < activeSet.length-1 ? (
                        <button onClick={()=>{ if(!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>c+1); }} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Next</button>
                      ) : (
                        <button onClick={()=>{ if(!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); stopTimer(); setPage('result'); }} className={solidBtn("bg-green-600 hover:bg-green-700")}>Submit</button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-[72px]">
              <div className="rounded-2xl p-4 bg-white/70 backdrop-blur border border-white/60 shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Question Palette</h4>
                  {mode==='test' && <span className={`text-xs px-2 py-1 rounded border ${remaining<=30?'border-red-500 text-red-600':'border-gray-300 text-gray-700'}`}>⏱ {fmt(remaining)}</span>}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_,i)=>{
                    const answered = answers[i]!=null; const isMarked = !!marked[i]; const isSkipped = !!skipped[i];
                    const s = answered && isMarked ? 'attempted_marked' : !answered && isMarked ? 'marked_only' : !answered && isSkipped ? 'skipped' : answered ? 'attempted' : 'unattempted';
                    const base="w-8 h-8 rounded-md flex items-center justify-center text-sm border shadow-sm transition-all duration-200 transform hover:scale-105 hover:shadow-md";
                    const ring=(i===current)?" ring-2 ring-teal-500":"";
                    const color = s==='attempted_marked' ? "bg-blue-500 text-white border-blue-600 hover:bg-blue-600"
                                 : s==='marked_only'     ? "bg-violet-500 text-white border-violet-600 hover:bg-violet-600"
                                 : s==='skipped'         ? "bg-red-500 text-white border-red-600 hover:bg-red-600"
                                 : s==='attempted'       ? "bg-[#32CD32] text-white border-green-600 hover:brightness-95"
                                                         : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100 hover:text-teal-600";
                    return <button key={i} onClick={()=>{ if(!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(i); }} className={`${base} ${color} ${ring}`}>{i+1}</button>;
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white border border-gray-300"></span> Unattempted</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[#32CD32] border border-green-600"></span> Attempted</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-violet-500 border border-violet-600"></span> Marked (no answer)</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500 border border-blue-600"></span> Attempted + Marked</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500 border border-red-600"></span> Skipped</div>
                </div>
                <div className="mt-4">
                  <button onClick={()=>{ stopTimer(); setPage('result'); }} className={solidBtn("w-full bg-green-600 hover:bg-green-700")}>Submit Test</button>
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
        <Confetti on={percent>=80}/>
        <TopBar page={page} mode={mode} timeLeft={remaining}
                onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <Background/>
        <main className="relative max-w-6xl mx-auto px-4 py-8">
          <section className={cardWrap}>
            <div className={glassCard}>
              <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 bg-white/20 rounded-full blur-3xl"></div>
              <h2 className="text-xl font-semibold">Result</h2>
              <p className="mt-1">Score : {score}/{total} ({percent}%)</p>
              {percent>=80 && <p className="text-sm text-teal-700 mt-1">Great job! 🎉</p>}

              <div className="space-y-3 mt-4">
                {activeSet.map((qq,i)=>{
                  const sel=answers[i]; const ok=sel===qq.answer;
                  return (
                    <div key={i} className="p-3 border rounded bg-white/60 backdrop-blur">
                      <div className="flex justify-between">
                        <b>Q{i+1}. {qq.question}</b>
                        <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{ok?'Correct':'Incorrect'}</span>
                      </div>
                      <p className="text-sm mt-1">Your: {sel||'Not answered'} | Correct: <b className="text-green-700">{qq.answer}</b></p>
                      {qq.explanation && <p className="text-sm text-gray-700 mt-1">{qq.explanation}</p>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <button onClick={()=>setPage('home')} className={glassBtn()}>Home</button>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* ----------------- HISTORY ----------------- */
  if (page === 'history') {
    const h = store.get();
    const sorted = [...h].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.timestamp) - new Date(a.timestamp);
      if (sortBy === 'date_asc') return new Date(a.timestamp) - new Date(b.timestamp);
      if (sortBy === 'score_desc') return (b.percent || 0) - (a.percent || 0);
      if (sortBy === 'score_asc') return (a.percent || 0) - (b.percent || 0);
      return 0;
    });

    const goHomeFromHistory = (ch, modeNext = 'practice', n = null) => {
      setChapter(ch); setMode(modeNext); if (n != null) setTestCount(n);
      setPage('home'); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
    };

    const pill = (extra = "") =>
      `px-3 py-1.5 rounded-lg text-sm border bg-white/70 backdrop-blur
       hover:bg-white/90 transition shadow-sm hover:shadow ${extra}`;

    return (
      <>
        <TopBar page={page} mode={mode} timeLeft={remaining}
                onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Past Results</h2>
            <select className="border rounded px-2 py-1" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="score_desc">Score high → low</option>
              <option value="score_asc">Score low → high</option>
            </select>
          </div>

          {sorted.length === 0 ? (
            <div className="text-gray-500">No attempts yet.</div>
          ) : (
            <div className="space-y-4">
              {sorted.map((a) => (
                <details key={a.id} className="rounded-xl border bg-white/70 backdrop-blur p-4">
                  <summary className="cursor-pointer flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">
                        {new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}
                      </div>
                      <div className="text-sm text-gray-700">
                        Score: {a.score}/{a.total} ({a.percent}%)
                        {a.durationSec ? ` • Time: ${fmt(a.durationSec)}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className={pill()} onClick={(e)=>{e.preventDefault();e.stopPropagation();goHomeFromHistory(a.chapter,'practice');}}>
                        Practice this chapter
                      </button>
                      <button className={pill("border-teal-400")} onClick={(e)=>{e.preventDefault();e.stopPropagation();goHomeFromHistory(a.chapter,'test',a.total);}}>
                        Retake test ({a.total})
                      </button>
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {a.questions.map((q,i)=>{
                      const your=a.answers[i]; const ok=your===q.answer;
                      return (
                        <div key={i} className="p-3 border rounded bg-white/60">
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

  /* ----------------- ANALYTICS (never blank) ----------------- */
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
        <TopBar page={page} mode={mode} timeLeft={remaining}
                onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">Chapter-wise Analytics</h2>
          {rows.length===0 ? (
            <div className="text-gray-600 bg-white/70 backdrop-blur border rounded-xl p-6">
              No data yet. Take a quick practice or test to see analytics here.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map(r=>(
                <div key={r.ch} className="p-4 border rounded-xl bg-white/70 backdrop-blur">
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