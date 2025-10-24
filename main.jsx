const { useEffect, useMemo, useRef, useState } = React;

/* ------------------- Storage ------------------- */
const LS_KEY = "econ_mcq_history_v2";
const store = {
  get(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v){ try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};

/* ------------------- Time helpers ------------------- */
const TIME_PER_Q_MIN = 1.2;                       // 1.2 minutes per question
const timeForN = n => Math.round(n * TIME_PER_Q_MIN * 60); // seconds
const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ------------------- Small utils ------------------- */
const shuffle = a => { const x=a.slice(); for(let i=x.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [x[i],x[j]]=[x[j],x[i]];} return x; };
const pickN = (arr,n) => shuffle(arr).slice(0,n);

/* ------------------- Background ------------------- */
const Background = () => (
  <>
    <div className="pointer-events-none fixed left-0 top-[32%] -translate-y-1/2
                    w-[44vmin] h-[58vmin] sm:w-[40vmin] sm:h-[52vmin]
                    bg-[url('./ganesh.png')] bg-no-repeat bg-contain bg-left
                    opacity-20" />
    <div className="fixed inset-0 -z-10 bg-rose-50/20" />
  </>
);

/* ------------------- Top Bar ------------------- */
const TopBar = ({ onHome, onHistory, onAnalytics, page, mode, timeLeft }) => (
  <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-base md:text-lg font-semibold">
        <span className="font-extrabold text-gray-900">EconoLearn</span>
        <span className="text-gray-500 font-semibold"> — CUET PG Economics</span>
      </h1>
      <div className="flex items-center gap-2 text-sm">
        {page==='home' && <>
          <button onClick={onHistory} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">Review Past Results</button>
          <button onClick={onAnalytics} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">Analytics</button>
        </>}
        {page==='quiz' && mode==='test' &&
          <span className={`px-2 py-1 rounded border ${timeLeft<=30?'border-red-500 text-red-600':'border-gray-300 text-gray-700'}`}>⏱ {fmt(timeLeft)}</span>}
        {page!=='home' && <button onClick={onHome} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">Home</button>}
      </div>
    </div>
  </header>
);

/* ------------------- App ------------------- */
function App(){
  // global
  const [page, setPage] = useState('home');               // home | quiz | result | history | analytics
  const [mode, setMode] = useState('practice');           // practice | test
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

  // load questions
  useEffect(()=>{
    fetch('questions.json?v='+Date.now())
      .then(r=>{ if(!r.ok) throw new Error; return r.json(); })
      .then(d=> Array.isArray(d) ? setQuestions(d) : setQuestions(d?.questions ?? []))
      .catch(()=> setErr('Could not load questions.json'))
      .finally(()=> setLoading(false));
  },[]);

  // derived helpers (no hooks inside pages)
  const total = activeSet.length;
  const attemptedCount = () => Object.keys(answers).filter(k=>answers[k]!=null).length;
  const unattemptedCount = () => Math.max(0, total - attemptedCount());
  const score = () => activeSet.reduce((s,q,i)=> s + (answers[i]===q.answer?1:0), 0);

  // timer
  const stopTimer = ()=>{ if(timer.current){ clearInterval(timer.current); timer.current=null; } };
  const startTimer = (sec)=>{ stopTimer(); setRemaining(sec);
    timer.current = setInterval(()=> setRemaining(p=>{ if(p<=1){ clearInterval(timer.current); setPage('result'); return 0; } return p-1; }), 1000);
  };

  // nav
  const resetRun = ()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); };
  const startPractice = ()=>{ const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter); setActiveSet(s); resetRun(); stopTimer(); setPage('quiz'); };
  const startTest = ()=>{
    const pool = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const req = Math.max(1, parseInt(testCount||1,10));
    const n = Math.max(1, Math.min(req, pool.length));
    const s = pickN(pool, n);
    setActiveSet(s); resetRun(); startTimer(timeForN(n)); setPage('quiz');
  };

  // persist results
  useEffect(()=>{
    if(page!=='result' || !total) return;
    const entry = {
      id: 'attempt_'+Date.now(),
      timestamp: new Date().toISOString(),
      mode, chapter, total, score: score(),
      percent: total? Math.round(score()/total*100):0,
      durationSec: mode==='test' ? timeForN(total) : null,
      answers: Array.from({length: total}, (_,i)=>answers[i] ?? null),
      questions: activeSet.map(q=>({chapter:q.chapter, question:q.question, options:q.options, answer:q.answer, source:q.source ?? null}))
    };
    const h = store.get(); h.unshift(entry); store.set(h.slice(0,50));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[page]);

  /* ---------------- Render ---------------- */
  if(loading){
    return <>
      <TopBar page={page} mode={mode} timeLeft={remaining} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <main className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">Loading questions…</main>
    </>;
  }
  if(err){
    return <>
      <TopBar page={page} mode={mode} timeLeft={remaining} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <main className="max-w-6xl mx-auto px-4 py-10 text-center text-red-600">{err}</main>
    </>;
  }

  /* ---------------- Home ---------------- */
  if(page==='home'){
    const chapters = ['All', ...new Set(questions.map(q=>q.chapter).filter(Boolean))];
    const filteredCount = chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const req = Math.max(1, parseInt(testCount || 1, 10));
    const effectiveN = Math.min(req, filteredCount || 1);
    const est = timeForN(effectiveN);

    return <>
      <TopBar page={page} mode={mode} timeLeft={remaining}
              onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <Background/>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-6">
        <div className="text-center mb-3">
          <div className="text-3xl md:text-4xl font-extrabold text-gray-900">EconoLearn</div>
          <div className="text-lg md:text-xl text-gray-500">— CUET PG Economics</div>
        </div>
      </section>

      {/* Card */}
      <main className="max-w-5xl mx-auto px-4 pb-10">
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-200/70 via-red-200/60 to-rose-200/70 shadow-lg">
          <div className="rounded-3xl p-6 bg-white/70 backdrop-blur border border-white/60">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">EconoLearn — MCQ Practice for CUET PG Economics</h2>
            <p className="text-gray-700 mt-2">Practice chapter-wise Economics PYQs with instant feedback.</p>

            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm block mb-1">Chapter Filter</label>
                <select value={chapter} onChange={e=>setChapter(e.target.value)}
                        className="w-full p-2 pr-8 border rounded-lg bg-white focus:outline-none">
                  {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm block mb-1">Mode</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2"><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} /> Practice</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')} /> Test</label>
                </div>
              </div>
            </div>

            {mode==='test' && (
              <div className="mt-5 grid md:grid-cols-[1fr,220px] gap-6 items-end">
                <div>
                  <label className="text-sm block mb-1">No. of Questions</label>
                  <input type="number" min="1" max={filteredCount} value={testCount}
                         onChange={e=>setTestCount(e.target.value)}
                         className="w-28 p-2 border rounded-lg bg-white"/>
                  <p className="text-xs text-gray-700 mt-1">
                    Available: {filteredCount}{req>filteredCount && <span className="ml-2 text-rose-600 font-medium">(Requested {req}, using {effectiveN})</span>}
                  </p>
                </div>

                <div className="justify-self-end text-right">
                  <label className="text-sm block mb-1">Time limit</label>
                  <div className="p-2 border rounded bg-white text-sm w-28 text-center">{fmt(est)}</div>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3 flex-wrap">
              {mode==='practice'
                ? <button onClick={startPractice} className="px-5 py-2 rounded-lg text-white bg-brand hover:brightness-95">Start Practice</button>
                : <button onClick={startTest} className="px-5 py-2 rounded-lg text-white bg-brand hover:brightness-95">Start Test</button>
              }
              <button onClick={()=>setPage('history')} className="px-5 py-2 rounded-lg border bg-white hover:bg-gray-50">Review Past Results</button>
              <button onClick={()=>setPage('analytics')} className="px-5 py-2 rounded-lg border bg-white hover:bg-gray-50">Analytics</button>
            </div>
          </div>
        </div>
      </main>
    </>;
  }

  /* ---------------- Quiz ---------------- */
  if(page==='quiz'){
    const q = activeSet[current];
    if(!q) return null;

    const attempted = attemptedCount();
    const unattempted = unattemptedCount();

    return <>
      <TopBar page={page} mode={mode} timeLeft={remaining}
              onHome={()=>{ stopTimer(); setPage('home'); }}
              onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr,280px] gap-6">
          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">Question {current+1} of {total}</div>
              <div className="w-1/2 bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-brand" style={{width:`${Math.round(((current+1)/total)*100)}%`}}></div>
              </div>
            </div>

            <section className="rounded-3xl p-6 bg-white/70 backdrop-blur border border-white/60 animate-[slide_.35s_ease_both]">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-700">Chapter</div>
              <div className="mb-3 text-base font-medium">{q.chapter || '—'}</div>

              <h3 className="text-lg font-semibold leading-relaxed">{q.question}</h3>
              {q.source && <div className="mt-1 text-xs text-gray-700">Source: {q.source}</div>}

              <div className="mt-5 grid gap-3">
                {q.options.map((opt, idx) => {
                  const active = answers[current] === opt;
                  return (
                    <label key={idx}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-white hover:bg-gray-50 ${active?'border-brand ring-1 ring-brand/40':''}`}>
                      <input type="radio" name={`q-${current}`} className="accent-brand"
                             checked={active}
                             onChange={()=>{ setAnswers(p=>({...p,[current]:opt})); setSkipped(p=>{ const c={...p}; delete c[current]; return c; }); }} />
                      <span className="font-medium">{String.fromCharCode(65+idx)}.</span>
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={()=>{ if(!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>Math.max(0,c-1)); }} disabled={current===0} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50">Previous</button>
                  <button onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">Clear Response</button>
                  <button onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))} className={`px-4 py-2 rounded-lg border ${marked[current]?'bg-blue-500 text-white border-blue-500':'bg-white hover:bg-gray-50'}`}>
                    {marked[current] ? 'Unmark Review' : 'Mark for Review'}
                  </button>
                </div>

                <div className="flex-1"/>
                <div className="text-[13px] text-gray-700 text-right leading-tight mr-2">
                  <div>Attempted: <b>{attempted}</b></div>
                  <div>Unattempted: <b>{unattempted}</b></div>
                </div>

                {current < total-1
                  ? <button onClick={()=>{ if(!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>c+1); }} className="px-5 py-2 rounded-lg text-white bg-brand hover:brightness-95">Next</button>
                  : <button onClick={()=>{ if(!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); stopTimer(); setPage('result'); }} className="px-5 py-2 rounded-lg text-white bg-green-600 hover:brightness-95">Submit</button>
                }
              </div>
            </section>
          </div>

          {/* Palette simplified */}
          <aside className="lg:sticky lg:top-[72px]">
            <div className="rounded-2xl p-4 bg-white/70 backdrop-blur border border-white/60 shadow">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Question Palette</h4>
                {mode==='test' && <span className={`text-xs px-2 py-1 rounded border ${remaining<=30?'border-red-500 text-red-600':'border-gray-300 text-gray-700'}`}>⏱ {fmt(remaining)}</span>}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {activeSet.map((_,i)=>{
                  const ans = answers[i]!=null, m = !!marked[i], sk = !!skipped[i];
                  const s = ans && m ? 'attempted_marked' : !ans && m ? 'marked_only' : !ans && sk ? 'skipped' : ans ? 'attempted' : 'unattempted';
                  const base="w-8 h-8 rounded-md flex items-center justify-center text-sm border shadow-sm transition";
                  const ring=(i===current)?" ring-2 ring-brand":"";
                  const color = s==='attempted_marked' ? "bg-blue-500 text-white border-blue-600"
                               : s==='marked_only'     ? "bg-violet-500 text-white border-violet-600"
                               : s==='skipped'         ? "bg-red-500 text-white border-red-600"
                               : s==='attempted'       ? "bg-[#32CD32] text-white border-green-600"
                                                       : "bg-white text-gray-800 border-gray-300";
                  return <button key={i} onClick={()=>{ if(!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(i); }} className={`${base} ${color} ${ring}`}>{i+1}</button>;
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>;
  }

  /* ---------------- Result ---------------- */
  if(page==='result'){
    const s = score();
    const percent = total?Math.round(s/total*100):0;

    return <>
      <TopBar page={page} mode={mode} timeLeft={remaining}
              onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <Background/>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="rounded-3xl p-6 bg-white/70 backdrop-blur border">
          <h2 className="text-xl font-semibold">Result</h2>
          <p className="mt-1">Score : {s}/{total} ({percent}%)</p>
          <div className="space-y-3 mt-4">
            {activeSet.map((qq,i)=>{
              const sel = answers[i]; const ok = sel===qq.answer;
              return (
                <div key={i} className="p-3 border rounded bg-white">
                  <div className="flex justify-between">
                    <b>Q{i+1}. {qq.question}</b>
                    <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                      {ok?'Correct':'Incorrect'}
                    </span>
                  </div>
                  <p className="text-sm mt-1">Your: {sel || 'Not answered'} | Correct: <b className="text-green-700">{qq.answer}</b></p>
                  {qq.explanation && <p className="text-sm text-gray-700 mt-1">{qq.explanation}</p>}
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <button onClick={()=>setPage('home')} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">Home</button>
          </div>
        </div>
      </main>
    </>;
  }

  /* ---------------- History ---------------- */
  if(page==='history'){
    const h = store.get();
    const sorted = [...h].sort((a,b)=>{
      if (sortBy==='date_desc') return new Date(b.timestamp)-new Date(a.timestamp);
      if (sortBy==='date_asc')  return new Date(a.timestamp)-new Date(b.timestamp);
      if (sortBy==='score_desc') return (b.percent||0)-(a.percent||0);
      if (sortBy==='score_asc')  return (a.percent||0)-(b.percent||0);
      return 0;
    });

    return <>
      <TopBar page={page} mode={mode} timeLeft={remaining}
              onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
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
              <details key={a.id} className="rounded-xl border bg-white p-4">
                <summary className="cursor-pointer flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                    <div className="text-sm text-gray-700">Score: {a.score}/{a.total} ({a.percent}%) {a.durationSec?`• Time: ${fmt(a.durationSec)}`:''}</div>
                  </div>
                </summary>
                <div className="mt-3 space-y-2">
                  {a.questions.map((q,i)=>{
                    const your = a.answers[i]; const ok = your===q.answer;
                    return (
                      <div key={i} className="p-3 border rounded bg-white/70">
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
    </>;
  }

  /* ---------------- Analytics ---------------- */
  if(page==='analytics'){
    const hist = store.get();
    const agg = {};
    hist.forEach(at => {
      at.questions.forEach((q,i)=>{
        const ch = q.chapter || 'Unknown';
        if(!agg[ch]) agg[ch] = {correct:0,total:0};
        agg[ch].total++;
        if(at.answers[i]===q.answer) agg[ch].correct++;
      });
    });
    const rows = Object.entries(agg).map(([ch,{correct,total}])=>({
      ch, correct, total, pct: total?Math.round(correct/total*100):0
    })).sort((a,b)=>a.ch.localeCompare(b.ch));

    return <>
      <TopBar page={page} mode={mode} timeLeft={remaining}
              onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Chapter-wise Analytics</h2>
        {rows.length===0
          ? <div className="text-gray-500">No data yet.</div>
          : <div className="space-y-3">
              {rows.map(r=>(
                <div key={r.ch} className="p-3 border rounded-xl bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{r.ch}</div>
                    <div className="text-sm text-gray-700">{r.correct}/{r.total} correct • {r.pct}%</div>
                  </div>
                  <div className="mt-2 h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand" style={{width:`${r.pct}%`}}></div>
                  </div>
                </div>
              ))}
            </div>}
      </main>
    </>;
  }

  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);