const { useEffect, useMemo, useState, useRef } = React;

/* ----------------- helpers & storage ----------------- */
const LS_KEY = "econ_mcq_history_v2";
const ls = {
  get() { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};
const shuffle = (arr) => { const a = arr.slice(); for (let i=a.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sampleN = (arr, n) => shuffle(arr).slice(0, n);
const timeForQuestionsSec = (n) => Math.ceil(n * 1.2 * 60);

/* ----------------- Background (Home + Result, oval left) ----------------- */
function BackgroundImage() {
  return (
    <>
      {/* Oval-shaped Ganesh on the left */}
      <div
        className="
          pointer-events-none absolute left-0 top-1/2 -translate-y-1/2
          w-[45vmin] h-[60vmin] sm:w-[40vmin] sm:h-[55vmin]
          bg-[url('./ganesh.png')] bg-no-repeat bg-contain bg-left
          opacity-25 rounded-[999px]
        "
      ></div>

      {/* Gentle reddish wash */}
      <div className="absolute inset-0 bg-red-50/10"></div>
    </>
  );
}

/* ----------------- Reusable styles ----------------- */
const glassBtn = (extra="") =>
  `px-4 py-2 rounded-lg border border-white/40 bg-white/30 hover:bg-white/40
   text-gray-800 backdrop-blur-xl transition shadow-sm hover:shadow
   transform-gpu hover:scale-[1.03] active:scale-[0.99] ${extra}`;

const solidBtn = (extra="") =>
  `px-4 py-2 rounded-lg text-white shadow-md transform-gpu hover:scale-[1.03] active:scale-[0.99] ${extra}`;

/* ----------------- Confetti (10s duration) ----------------- */
function ConfettiBurst({ trigger }) {
  useEffect(() => {
    if (!trigger) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = 9999;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const colors = ["#14b8a6","#f43f5e","#60a5fa","#a78bfa","#22c55e","#f59e0b"];
    const N = Math.min(240, Math.floor((canvas.width + canvas.height) / 6));
    const gravity = 0.12, drag = 0.985;
    const cx = canvas.width/2, cy = canvas.height*0.15;

    const parts = Array.from({length: N}).map(() => {
      const angle = (Math.random()*Math.PI) - (Math.PI/2);
      const speed = 6 + Math.random()*8;
      return {
        x: cx + (Math.random()*80 - 40),
        y: cy + (Math.random()*20 - 10),
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed - 2,
        size: 2 + Math.random()*4,
        rot: Math.random()*Math.PI*2,
        vr: (Math.random()-0.5)*0.2,
        color: colors[(Math.random()*colors.length)|0],
        life: 0,
        ttl: 250 + Math.random()*100 // longer lifetime
      };
    });

    let raf, frame = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0,0,canvas.width,canvas.height);

      parts.forEach(p => {
        p.vx *= drag;
        p.vy = p.vy*drag + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life++;
        const alpha = Math.max(0, Math.min(1, 1 - (p.life / p.ttl)));
        ctx.globalAlpha = alpha;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size*0.5, p.size*2, p.size);
        ctx.restore();
        ctx.globalAlpha = 1;
      });

      if (frame < 600) { // ~10s
        raf = requestAnimationFrame(tick);
      } else {
        cleanup();
      }
    };

    const cleanup = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };

    raf = requestAnimationFrame(tick);
    return cleanup;
  }, [trigger]);

  return null;
}

/* ----------------- TopBar & ProgressBar ----------------- */
function TopBar({ page, onHome, total, attempted, mode, remainingSec }) {
  const mm = Math.floor(remainingSec/60);
  const ss = remainingSec%60;
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-base md:text-lg font-semibold">MCQ Practice – CUET PG Economics</h1>
        <div className="flex items-center gap-4 text-sm">
          {mode === 'test' && page === 'quiz' && (
            <span className={`px-2 py-1 rounded border ${remainingSec<=30 ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-700'}`}>
              ⏱ {String(mm).padStart(2,'0')}:{String(ss).padStart(2,'0')}
            </span>
          )}
          {page !== 'home' && (
            <button onClick={onHome} className={glassBtn()}>Home</button>
          )}
        </div>
      </div>
    </header>
  );
}

function ProgressBar({ currentIndex, total }) {
  const pct = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  return (
    <div className="w-full bg-white/40 backdrop-blur h-2 rounded-full shadow-inner">
      <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: pct + '%' }} />
    </div>
  );
}

/* ----------------- App ----------------- */
const App = () => {
  const [page, setPage] = useState('home');
  const [mode, setMode] = useState('practice');
  const [questions, setQuestions] = useState([]);
  const [activeSet, setActiveSet] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [skipped, setSkipped] = useState({});
  const [chapter, setChapter] = useState('All');
  const [testCount, setTestCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remainingSec, setRemainingSec] = useState(0);
  const timerRef = useRef(null);

  // guard to avoid saving same result twice
  const savedAttemptRef = useRef(false);

  /* load questions */
  useEffect(() => {
    fetch('questions.json?v=' + Date.now())
      .then(r => { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(data => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(list);
        setLoading(false);
      })
      .catch(() => { setError('Could not load questions.json'); setLoading(false); });
  }, []);

  const total = activeSet.length;
  const attempted = useMemo(() => Object.keys(answers).filter(k => answers[k] != null).length, [answers]);
  const unattempted = Math.max(0, total - attempted);
  const score = useMemo(()=>activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[answers,activeSet]);

  const markSkippedIfUnanswered = (i) => { if (!answers[i] && !marked[i]) setSkipped(p => ({...p, [i]: true})); };
  const handleSelect = (opt) => {
    setAnswers(p => ({...p, [current]: opt}));
    setSkipped(p => { const c={...p}; delete c[current]; return c; });
  };
  const clearResponse = () => setAnswers(p => { const c={...p}; delete c[current]; return c; });
  const prev = () => { markSkippedIfUnanswered(current); if (current>0) setCurrent(c=>c-1); };
  const next = () => { markSkippedIfUnanswered(current); if (current<total-1) setCurrent(c=>c+1); };
  const goto = (i) => { markSkippedIfUnanswered(current); setCurrent(i); };
  const goHome = () => { setPage('home'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); stopTimer(); savedAttemptRef.current=false; };

  const startTimer = (sec) => {
    stopTimer();
    setRemainingSec(sec);
    timerRef.current = setInterval(() => {
      setRemainingSec(p => {
        if (p<=1){ clearInterval(timerRef.current); setPage('result'); return 0; }
        return p-1;
      });
    },1000);
  };
  const stopTimer = ()=>{ if(timerRef.current){clearInterval(timerRef.current); timerRef.current=null;} };

  const startPractice = () => {
    const f = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    setActiveSet(f);
    setPage('quiz'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({});
    stopTimer();
    savedAttemptRef.current=false;
  };
  const startTest = () => {
    const f = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const n=Math.max(1, Math.min(parseInt(testCount||1,10), f.length));
    const s=sampleN(f,n);
    setActiveSet(s);
    setPage('quiz'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({});
    startTimer(timeForQuestionsSec(n));
    savedAttemptRef.current=false;
  };

  const submitNow = () => { stopTimer(); setPage('result'); };

  /* ---------- SAVE RESULT TO LOCALSTORAGE WHEN RESULT PAGE OPENS ---------- */
  useEffect(() => {
    if (page !== 'result' || savedAttemptRef.current) return;

    const percent = total ? Math.round((score/total)*100) : 0;

    // normalize answers to an array aligned with question order
    const answersArray = Array.from({length: total}, (_, i) => answers[i] ?? null);

    const attempt = {
      id: 'attempt_' + Date.now(),
      timestamp: new Date().toISOString(),
      mode,
      chapter,
      total,
      score,
      percent,
      durationSec: mode === 'test' ? timeForQuestionsSec(total) : null,
      answers: answersArray,
      questions: activeSet.map(q => ({
        chapter: q.chapter,
        question: q.question,
        options: q.options,
        answer: q.answer,
        source: q.source ?? null
      }))
    };

    const history = ls.get();
    history.unshift(attempt);
    ls.set(history.slice(0, 50)); // keep latest 50
    savedAttemptRef.current = true;
    // console.log('Saved attempt:', attempt);
  }, [page, mode, chapter, total, score, answers, activeSet]);

  /* ----------------- LOADING/ERROR ----------------- */
  if (loading) {
    return (
      <>
        <TopBar page={page} onHome={goHome} total={0} attempted={0} mode={mode} remainingSec={0}/>
        <main className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-center text-lg text-gray-500">Loading questions…</div>
        </main>
      </>
    );
  }
  if (error) {
    return (
      <>
        <TopBar page={page} onHome={goHome} total={0} attempted={0} mode={mode} remainingSec={0}/>
        <main className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-center text-red-600">{error}</div>
          <p className="text-center text-sm text-gray-500 mt-2">
            Ensure <code>questions.json</code> is next to <code>index.html</code> and valid JSON.
          </p>
        </main>
      </>
    );
  }

  /* ----------------- HOME ----------------- */
  if(page==='home'){
    const filteredCount=chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const est=timeForQuestionsSec(Math.min(testCount,filteredCount||1));
    const mm=Math.floor(est/60),ss=est%60;
    return(
      <>
        <TopBar page={page} onHome={goHome} total={questions.length} attempted={0} mode={mode}/>
        <div className="relative min-h-screen">
          <BackgroundImage/>
          <main className="relative max-w-6xl mx-auto px-4 py-10 space-y-8">
            {/* Glass HOME card with gradient ring */}
            <section className="relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-200/70 via-red-200/60 to-rose-200/70 shadow-lg shadow-red-200/40">
              <div className="relative overflow-hidden rounded-3xl p-6 bg-white/30 backdrop-blur-xl border border-white/40">
                <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 bg-white/20 rounded-full blur-3xl"></div>

                <h2 className="text-2xl font-semibold">MCQ Practice – CUET PG Economics</h2>
                <p className="text-gray-700 mt-1">Practice chapter-wise Economics PYQs with instant feedback.</p>
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">Chapter Filter</label>
                    <select value={chapter} onChange={e=>setChapter(e.target.value)} className="w-full p-2 border rounded-lg bg-white/60 backdrop-blur">
                      {['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm">Mode</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2"><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')}/> Practice</label>
                      <label className="flex items-center gap-2"><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')}/> Test</label>
                    </div>
                  </div>
                </div>
                {mode==='test'&&(
                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm">No. of Questions</label>
                      <input type="number" min="1" value={testCount} onChange={e=>setTestCount(e.target.value)} className="w-full p-2 border rounded-lg bg-white/60 backdrop-blur"/>
                      <p className="text-xs text-gray-700 mt-1">Available: {filteredCount}</p>
                    </div>
                    <div className="flex items-end">
                      <div className="p-2 border rounded bg-white/60 backdrop-blur text-sm">Estimated Time : {mm}:{String(ss).padStart(2,'0')}</div>
                    </div>
                  </div>
                )}
                <div className="mt-6">
                  {mode==='practice'?(
                    <button onClick={startPractice} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Start Practice</button>
                  ):(
                    <button onClick={startTest} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Start Test</button>
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>
      </>
    );
  }

  /* ----------------- QUIZ ----------------- */
  if(page==='quiz'){
    const q=activeSet[current];
    if (!q) {
      return (
        <>
          <TopBar page={page} onHome={goHome} total={0} attempted={0} mode={mode} remainingSec={remainingSec}/>
          <main className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">
            No questions found for the selected filter.
          </main>
        </>
      );
    }
    const sel=answers[current];

    // palette status
    const statusFor=(i)=>{
      const answered = answers[i] != null;
      const isMarked = !!marked[i];
      const isSkipped = !!skipped[i];
      if (answered && isMarked) return 'attempted_marked'; // BLUE
      if (!answered && isMarked) return 'marked_only';     // PURPLE
      if (!answered && isSkipped) return 'skipped';        // RED
      if (answered) return 'attempted';                    // GREEN
      return 'unattempted';                                // WHITE
    };

    // dynamic Mark for Review color (button)
    const markBtnColor = sel
      ? marked[current]
        ? "bg-blue-500/80 text-white border-blue-300 hover:bg-blue-600/80"
        : ""
      : marked[current]
      ? "bg-violet-500/80 text-white border-violet-300 hover:bg-violet-600/80"
      : "";

    return(
      <>
        <TopBar page={page} onHome={goHome} total={total} attempted={attempted} mode={mode} remainingSec={remainingSec}/>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,280px] gap-6">
            {/* left: Glass question card */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600">Question {current+1} of {total}</div>
                <div className="w-1/2"><ProgressBar currentIndex={current} total={total}/></div>
              </div>

              {/* gradient ring + glass container with animation */}
              <section className="relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-200/70 via-red-200/60 to-rose-200/70 shadow-lg shadow-red-200/40">
                <div
                  key={current}
                  className="relative overflow-hidden rounded-3xl p-6 bg-white/30 backdrop-blur-xl border border-white/40 animate-slidefade"
                >
                  <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 bg-white/20 rounded-full blur-3xl"></div>

                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-700">Chapter</div>
                  <div className="mb-4 text-base font-medium">{q.chapter || '—'}</div>

                  <h3 className="text-lg font-semibold leading-relaxed">{q.question}</h3>
                  {q.source && <div className="mt-1 text-xs text-gray-700">Source: {q.source}</div>}

                  <div className="mt-5 grid gap-3">
                    {q.options.map((opt, idx) => {
                      const active = sel === opt;
                      return (
                        <label key={idx}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition
                                      bg-white/50 backdrop-blur hover:bg-white/70
                                      ${active ? 'border-teal-500 ring-1 ring-teal-300' : 'border-white/50'}`}>
                          <input
                            type="radio"
                            name={`q-${current}`}
                            className="accent-teal-500"
                            checked={active}
                            onChange={() => handleSelect(opt)}
                          />
                          <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* toolbar */}
                  <div className="mt-6 flex items-center gap-3">
                    {/* LEFT GROUP */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={prev} disabled={current===0} className={glassBtn("disabled:opacity-50")}>
                        Previous
                      </button>

                      <button onClick={clearResponse} className={glassBtn()} title="Clear the selected option">
                        Clear Response
                      </button>

                      {/* dynamic Mark for Review button */}
                      <button
                        onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))}
                        className={`${glassBtn()} ${markBtnColor}`}
                      >
                        {marked[current] ? 'Unmark Review' : 'Mark for Review'}
                      </button>
                    </div>

                    {/* Spacer pushes right group */}
                    <div className="flex-1" />

                    {/* RIGHT GROUP (stacked counters) */}
                    <div className="flex items-center gap-4">
                      <div className="text-[13px] text-gray-700 text-right leading-tight">
                        <div>Attempted: <b>{attempted}</b></div>
                        <div className="mt-1">Unattempted: <b>{unattempted}</b></div>
                      </div>

                      {current < total - 1 ? (
                        <button onClick={next} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>
                          Next
                        </button>
                      ) : (
                        <button onClick={submitNow} className={solidBtn("bg-green-600 hover:bg-green-700")}>
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* right: palette */}
            <aside className="lg:sticky lg:top-[72px]">
              <div className="rounded-2xl p-4 bg-white/70 backdrop-blur border border-white/60 shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Question Palette</h4>
                  {mode === 'test' && (
                    <span className={`text-xs px-2 py-1 rounded border ${remainingSec<=30 ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-700'}`}>
                      ⏱ {String(Math.floor(remainingSec/60)).padStart(2,'0')}:{String(remainingSec%60).padStart(2,'0')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_, i) => {
                    const s = statusFor(i);

                    // 🔥 Hover polish: scale + shadow + color tint
                    const base =
                      "w-8 h-8 rounded-md flex items-center justify-center text-sm border shadow-sm " +
                      "transition-all duration-200 transform hover:scale-105 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";

                    const ring = (i === current) ? " ring-2 ring-teal-500" : "";

                    const color =
                      s==='attempted_marked' ? "bg-blue-500 text-white border-blue-600 hover:bg-blue-600" :
                      s==='marked_only'     ? "bg-violet-500 text-white border-violet-600 hover:bg-violet-600" :
                      s==='skipped'         ? "bg-red-500 text-white border-red-600 hover:bg-red-600" :
                      s==='attempted'       ? "bg-[#32CD32] text-white border-green-600 hover:brightness-95" :
                                              "bg-white text-gray-800 border-gray-300 hover:bg-gray-100 hover:text-teal-600"; // ✅ visible + hover

                    return (
                      <button key={i} className={`${base} ${color} ${ring}`} onClick={()=>goto(i)} title={`Go to Q${i+1}`}>
                        {i+1}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-white border border-gray-300"></span> Unattempted
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-[#32CD32] border border-green-600"></span> Attempted
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-violet-500 border border-violet-600"></span> Marked (no answer)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-blue-500 border border-blue-600"></span> Attempted + Marked
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-500 border border-red-600"></span> Skipped
                  </div>
                </div>

                <div className="mt-4">
                  <button onClick={submitNow} className={solidBtn("w-full bg-green-600 hover:bg-green-700")}>
                    Submit Test
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </>
    );
  }

  /* ----------------- RESULT ----------------- */
  if(page==='result'){
    const percent=total?Math.round(score/total*100):0;

    return(
      <>
        {/* 🎉 Confetti triggers automatically when ≥80% */}
        <ConfettiBurst trigger={percent >= 80} />

        <TopBar page={page} onHome={goHome} total={total} attempted={attempted} mode={mode}/>
        <div className="relative min-h-screen">
          <BackgroundImage/>
          <main className="relative max-w-6xl mx-auto px-4 py-8">
            <section className="relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-200/70 via-red-200/60 to-rose-200/70 shadow-lg shadow-red-200/40">
              <div className="relative overflow-hidden rounded-3xl p-6 bg-white/30 backdrop-blur-xl border border-white/40">
                <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 bg-white/20 rounded-full blur-3xl"></div>

                <div className="flex justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Result</h2>
                    <p>Score : {score}/{total} ({percent}%)</p>
                    {percent >= 80 && <p className="text-sm text-teal-700 mt-1">Great job! 🎉</p>}
                  </div>
                  <button onClick={goHome} className={glassBtn()}>Home</button>
                </div>
                {activeSet.map((q,i)=>{
                  const sel=answers[i];const ok=sel===q.answer;
                  return(
                    <div key={i} className="p-3 mb-3 border rounded bg-white/60 backdrop-blur">
                      <div className="flex justify-between">
                        <b>Q{i+1}. {q.question}</b>
                        <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{ok?'Correct':'Incorrect'}</span>
                      </div>
                      <p className="text-sm">Your: {sel||'Not answered'} | Correct: <b className="text-green-700">{q.answer}</b></p>
                      {q.explanation && <p className="text-sm text-gray-700 mt-1">{q.explanation}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          </main>
        </div>
      </>
    );
  }
  return null;
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
