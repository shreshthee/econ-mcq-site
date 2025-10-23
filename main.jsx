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
const fmtTime = (sec) => `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;

/* ----------------- Background (Home + Result, oval left) ----------------- */
function BackgroundImage() {
  return (
    <>
      <div
        className="
          pointer-events-none absolute left-0 top-1/2 -translate-y-1/2
          w-[45vmin] h-[60vmin] sm:w-[40vmin] sm:h-[55vmin]
          bg-[url('./ganesh.png')] bg-no-repeat bg-contain bg-left
          opacity-25 rounded-[999px]
        "
      />
      <div className="absolute inset-0 bg-red-50/10" />
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
    canvas.style.position = 'fixed'; canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none'; canvas.style.zIndex = 9999;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);

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
        ttl: 250 + Math.random()*100
      };
    });

    let raf, frame = 0;
    const tick = () => {
      frame++; ctx.clearRect(0,0,canvas.width,canvas.height);
      parts.forEach(p => {
        p.vx *= drag; p.vy = p.vy*drag + gravity; p.x += p.vx; p.y += p.vy;
        p.rot += p.vr; p.life++;
        const alpha = Math.max(0, Math.min(1, 1 - (p.life / p.ttl)));
        ctx.globalAlpha = alpha; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size*0.5, p.size*2, p.size);
        ctx.restore(); ctx.globalAlpha = 1;
      });
      if (frame < 600) { raf = requestAnimationFrame(tick); } else cleanup();
    };
    const cleanup = () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
    raf = requestAnimationFrame(tick);
    return cleanup;
  }, [trigger]);
  return null;
}

/* ----------------- TopBar ----------------- */
function TopBar({ page, onHome, total, attempted, mode, remainingSec, onOpenHistory, onOpenAnalytics }) {
  const mm = Math.floor(remainingSec/60), ss = remainingSec%60;
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-base md:text-lg font-semibold">EconoLearn – CUET PG Economics</h1>
        <div className="flex items-center gap-2 md:gap-3 text-sm">
          {page === 'home' && (
            <>
              <button onClick={onOpenHistory} className={glassBtn()}>Review Past Results</button>
              <button onClick={onOpenAnalytics} className={glassBtn()}>Analytics</button>
            </>
          )}
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

/* ----------------- CSV / PDF exports ----------------- */
function download(filename, text, type="text/plain") {
  const blob = new Blob([text], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function exportHistoryCSV(history) {
  const header = ['id','timestamp','mode','chapter','total','score','percent','durationSec'];
  const rows = history.map(h => header.map(k => (h[k] ?? '')).join(','));
  download('mcq_history.csv', [header.join(','), ...rows].join('\n'), 'text/csv');
}

function exportAttemptCSV(attempt) {
  const header = ['q#','chapter','question','your_answer','correct_answer','is_correct','source'];
  const rows = attempt.questions.map((q,i) => {
    const your = attempt.answers[i] ?? '';
    const ok = your === q.answer ? '1' : '0';
    return [
      i+1,
      `"${(q.chapter||'').replace(/"/g,'""')}"`,
      `"${(q.question||'').replace(/"/g,'""')}"`,
      `"${(your||'').replace(/"/g,'""')}"`,
      `"${(q.answer||'').replace(/"/g,'""')}"`,
      ok,
      `"${(q.source||'').replace(/"/g,'""')}"`
    ].join(',');
  });
  download(`attempt_${attempt.id}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv');
}

async function exportAttemptPDF(attempt) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { alert('PDF library not loaded'); return; }
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 36; let y = margin;

  const addLine = (text, size=11, bold=false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, 523);
    lines.forEach(line => { doc.text(line, margin, y); y += 16; });
  };

  addLine('EconoLearn – CUET PG Economics', 14, true);
  addLine(`Attempt: ${attempt.id}`, 10);
  addLine(`Date: ${new Date(attempt.timestamp).toLocaleString()}`, 10);
  addLine(`Mode: ${attempt.mode} | Chapter: ${attempt.chapter} | Score: ${attempt.score}/${attempt.total} (${attempt.percent}%)`, 10);
  if (attempt.durationSec) addLine(`Allocated Time: ${fmtTime(attempt.durationSec)}`, 10);
  y += 6;

  attempt.questions.forEach((q, i) => {
    if (y > 780) { doc.addPage(); y = margin; }
    addLine(`Q${i+1}. ${q.question}`, 11, true);
    addLine(`Chapter: ${q.chapter || '—'} | Source: ${q.source || '—'}`, 9);
    addLine(`Your: ${attempt.answers[i] ?? 'Not answered'} | Correct: ${q.answer}`, 10);
    y += 4;
  });

  doc.save(`attempt_${attempt.id}.pdf`);
}

/* ----------------- Analytics helpers ----------------- */
function computeChapterStats(history) {
  const agg = {};
  history.forEach(h => {
    h.questions.forEach((q, i) => {
      const ch = q.chapter || 'Unknown';
      if (!agg[ch]) agg[ch] = { correct:0, total:0 };
      agg[ch].total += 1;
      if (h.answers[i] === q.answer) agg[ch].correct += 1;
    });
  });
  const rows = Object.entries(agg).map(([chapter, {correct,total}]) => ({
    chapter, correct, total, pct: total? Math.round((correct/total)*100):0
  })).sort((a,b)=>a.chapter.localeCompare(b.chapter));
  return rows;
}

/* ----------------- App ----------------- */
const App = () => {
  const [page, setPage] = useState('home'); // home | quiz | result | history | analytics
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
  const [history, setHistory] = useState(ls.get());
  const [sortBy, setSortBy] = useState('date_desc'); // for history page
  const timerRef = useRef(null);
  const savedAttemptRef = useRef(false);

  /* load questions */
  useEffect(() => {
    fetch('questions.json?v=' + Date.now())
      .then(r => { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(data => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(list); setLoading(false);
      })
      .catch(() => { setError('Could not load questions.json'); setLoading(false); });
  }, []);

  /* Keyboard shortcuts on quiz */
  useEffect(() => {
    if (page !== 'quiz') return;
    const handler = (e) => {
      if (['INPUT','SELECT','TEXTAREA'].includes((e.target.tagName||'').toUpperCase())) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (current>0) setCurrent(c=>c-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (current<activeSet.length-1) setCurrent(c=>c+1); }
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); setMarked(p=>({...p,[current]:!p[current]})); }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); setAnswers(p=>{const c={...p}; delete c[current]; return c;}); }
      if (['1','2','3','4'].includes(e.key)) {
        const idx = Number(e.key)-1;
        const q = activeSet[current]; if (!q || !q.options[idx]) return;
        e.preventDefault(); setAnswers(p=>({...p, [current]: q.options[idx]}));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [page, current, activeSet]);

  const total = activeSet.length;
  const attempted = useMemo(() => Object.keys(answers).filter(k => answers[k] != null).length, [answers]);
  const unattempted = Math.max(0, total - attempted);
  const score = useMemo(()=>activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[answers,activeSet]);

  const markSkippedIfUnanswered = (i) => { if (!answers[i] && !marked[i]) setSkipped(p => ({...p, [i]: true})); };
  const handleSelect = (opt) => { setAnswers(p => ({...p, [current]: opt})); setSkipped(p => { const c={...p}; delete c[current]; return c; }); };
  const clearResponse = () => setAnswers(p => { const c={...p}; delete c[current]; return c; });
  const prev = () => { markSkippedIfUnanswered(current); if (current>0) setCurrent(c=>c-1); };
  const next = () => { markSkippedIfUnanswered(current); if (current<total-1) setCurrent(c=>c+1); };
  const goto = (i) => { markSkippedIfUnanswered(current); setCurrent(i); };
  const goHome = () => { setPage('home'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); stopTimer(); savedAttemptRef.current=false; };

  const startTimer = (sec) => { stopTimer(); setRemainingSec(sec);
    timerRef.current = setInterval(() => {
      setRemainingSec(p => { if (p<=1){ clearInterval(timerRef.current); setPage('result'); return 0; } return p-1; });
    },1000);
  };
  const stopTimer = ()=>{ if(timerRef.current){clearInterval(timerRef.current); timerRef.current=null;} };

  const startPractice = () => {
    const f = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    setActiveSet(f); setPage('quiz'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); stopTimer(); savedAttemptRef.current=false;
  };
  const startTest = () => {
    const f = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const n=Math.max(1, Math.min(parseInt(testCount||1,10), f.length));
    const s=sampleN(f,n);
    setActiveSet(s); setPage('quiz'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); startTimer(timeForQuestionsSec(n)); savedAttemptRef.current=false;
  };

  const submitNow = () => { stopTimer(); setPage('result'); };

  /* Save result on entering Result page */
  useEffect(() => {
    if (page !== 'result' || savedAttemptRef.current) return;
    const percent = total ? Math.round((score/total)*100) : 0;
    const answersArray = Array.from({length: total}, (_, i) => answers[i] ?? null);
    const attempt = {
      id: 'attempt_' + Date.now(),
      timestamp: new Date().toISOString(),
      mode, chapter, total, score, percent,
      durationSec: mode === 'test' ? timeForQuestionsSec(total) : null,
      answers: answersArray,
      questions: activeSet.map(q => ({ chapter: q.chapter, question: q.question, options: q.options, answer: q.answer, source: q.source ?? null }))
    };
    const h = ls.get(); h.unshift(attempt); ls.set(h.slice(0, 50)); savedAttemptRef.current = true; 
    // update state history so History/Analytics pages reflect latest
    try { const latest = ls.get(); } catch {}
  }, [page, mode, chapter, total, score, answers, activeSet]);

  /* ----------------- LOADING/ERROR ----------------- */
  if (loading) {
    return (<>
      <TopBar page={page} onHome={goHome} total={0} attempted={0} mode={mode} remainingSec={0}
              onOpenHistory={()=>setPage('history')} onOpenAnalytics={()=>setPage('analytics')}/>
      <main className="max-w-6xl mx-auto px-4 py-10 text-center text-lg text-gray-500">Loading questions…</main>
    </>);
  }
  if (error) {
    return (<>
      <TopBar page={page} onHome={goHome} total={0} attempted={0} mode={mode} remainingSec={0}
              onOpenHistory={()=>setPage('history')} onOpenAnalytics={()=>setPage('analytics')}/>
      <main className="max-w-6xl mx-auto px-4 py-10 text-center">
        <div className="text-red-600">{error}</div>
        <p className="text-sm text-gray-500 mt-2">Ensure <code>questions.json</code> is next to <code>index.html</code> and valid JSON.</p>
      </main>
    </>);
  }

  /* ----------------- HOME ----------------- */
  if(page==='home'){
    const filteredCount=chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const est=timeForQuestionsSec(Math.min(testCount,filteredCount||1));
    const mm=Math.floor(est/60),ss=est%60;
    return(
      <>
        <TopBar page={page} onHome={goHome} total={questions.length} attempted={0} mode={mode}
                onOpenHistory={()=>setPage('history')} onOpenAnalytics={()=>setPage('analytics')}/>
        <div className="relative min-h-screen">
          <BackgroundImage/>
          <main className="relative max-w-6xl mx-auto px-4 py-10 space-y-8">
            <section className="relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-200/70 via-red-200/60 to-rose-200/70 shadow-lg shadow-red-200/40">
              <div className="relative overflow-hidden rounded-3xl p-6 bg-white/30 backdrop-blur-xl border border-white/40">
                <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 bg-white/20 rounded-full blur-3xl"></div>
                <h2 className="text-2xl font-semibold">EconoLearn – MCQ Practice for CUET PG Economics</h2>
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
                <div className="mt-6 flex gap-3 flex-wrap">
                  {mode==='practice'?(
                    <button onClick={()=>{
                      const f = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
                      setActiveSet(f); setPage('quiz'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); 
                    }} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Start Practice</button>
                  ):(
                    <button onClick={()=>{
                      const f = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
                      const n=Math.max(1, Math.min(parseInt(testCount||1,10), f.length));
                      const s=sampleN(f,n); setActiveSet(s); setPage('quiz'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); 
                      const sec=timeForQuestionsSec(n); setRemainingSec(sec);
                      if (sec>0) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        timerRef.current=setInterval(()=>{
                          setRemainingSec(p=>{ if(p<=1){ clearInterval(timerRef.current); setPage('result'); return 0;} return p-1; });
                        },1000);
                      }
                    }} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Start Test</button>
                  )}
                  <button onClick={()=>setPage('history')} className={glassBtn()}>Review Past Results</button>
                  <button onClick={()=>setPage('analytics')} className={glassBtn()}>Analytics</button>
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
    if (!q) return (<> <TopBar page={page} onHome={goHome} total={0} attempted={0} mode={mode} remainingSec={remainingSec}/> <main className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">No questions found for the selected filter.</main> </>);
    const sel=answers[current];

    const statusFor=(i)=>{
      const answered = answers[i] != null; const isMarked = !!marked[i]; const isSkipped = !!skipped[i];
      if (answered && isMarked) return 'attempted_marked';
      if (!answered && isMarked) return 'marked_only';
      if (!answered && isSkipped) return 'skipped';
      if (answered) return 'attempted';
      return 'unattempted';
    };

    const markBtnColor = sel
      ? marked[current] ? "bg-blue-500/80 text-white border-blue-300 hover:bg-blue-600/80" : ""
      : marked[current] ? "bg-violet-500/80 text-white border-violet-300 hover:bg-violet-600/80" : "";

    const attemptedCount = attempted;
    const unattemptedCount = Math.max(0, total - attemptedCount);

    return(
      <>
        <TopBar page={page} onHome={goHome} total={total} attempted={attemptedCount} mode={mode} remainingSec={remainingSec}/>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,280px] gap-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600">Question {current+1} of {total}</div>
                <div className="w-1/2"><ProgressBar currentIndex={current} total={total}/></div>
              </div>

              <section className="relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-200/70 via-red-200/60 to-rose-200/70 shadow-lg shadow-red-200/40">
                <div key={current} className="relative overflow-hidden rounded-3xl p-6 bg-white/30 backdrop-blur-xl border border-white/40 animate-slidefade">
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
                          <input type="radio" name={`q-${current}`} className="accent-teal-500" checked={active} onChange={() => { setAnswers(p => ({...p, [current]: opt})); setSkipped(p => { const c={...p}; delete c[current]; return c; }); }} />
                          <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={()=>{ if (!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); if (current>0) setCurrent(c=>c-1); }} disabled={current===0} className={glassBtn("disabled:opacity-50")}>Previous</button>
                      <button onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})} className={glassBtn()} title="Clear the selected option">Clear Response</button>
                      <button onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))} className={`${glassBtn()} ${markBtnColor}`}>{marked[current] ? 'Unmark Review' : 'Mark for Review'}</button>
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-4">
                      <div className="text-[13px] text-gray-700 text-right leading-tight">
                        <div>Attempted: <b>{attemptedCount}</b></div>
                        <div className="mt-1">Unattempted: <b>{unattemptedCount}</b></div>
                      </div>
                      {current < total - 1 ? (
                        <button onClick={()=>{ if (!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>c+1); }} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Next</button>
                      ) : (
                        <button onClick={()=>{ if (!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); stopTimer(); setPage('result'); }} className={solidBtn("bg-green-600 hover:bg-green-700")}>Submit</button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Palette */}
            <aside className="lg:sticky lg:top-[72px]">
              <div className="rounded-2xl p-4 bg-white/70 backdrop-blur border border-white/60 shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Question Palette</h4>
                  {mode === 'test' && (
                    <span className={`text-xs px-2 py-1 rounded border ${remainingSec<=30 ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-700'}`}>
                      ⏱ {fmtTime(remainingSec)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_, i) => {
                    const s = statusFor(i);
                    const base = "w-8 h-8 rounded-md flex items-center justify-center text-sm border shadow-sm transition-all duration-200 transform hover:scale-105 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";
                    const ring=(i===current)?" ring-2 ring-teal-500":"";
                    const color =
                      s==='attempted_marked' ? "bg-blue-500 text-white border-blue-600 hover:bg-blue-600" :
                      s==='marked_only'     ? "bg-violet-500 text-white border-violet-600 hover:bg-violet-600" :
                      s==='skipped'         ? "bg-red-500 text-white border-red-600 hover:bg-red-600" :
                      s==='attempted'       ? "bg-[#32CD32] text-white border-green-600 hover:brightness-95" :
                                              "bg-white text-gray-800 border-gray-300 hover:bg-gray-100 hover:text-teal-600";
                    return (
                      <button key={i} className={`${base} ${color} ${ring}`} onClick={()=>{ if (!answers[current] && !marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(i); }} title={`Go to Q${i+1}`}>
                        {i+1}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
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
  if(page==='result'){
    const total = activeSet.length;
    const score = activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0);
    const percent=total?Math.round(score/total*100):0;

    // get last saved from LS (for export buttons)
    const saved = ls.get()[0] || null;

    return(
      <>
        <ConfettiBurst trigger={percent >= 80} />
        <TopBar page={page} onHome={()=>{ setPage('home'); }} total={total} attempted={0} mode={mode}
                onOpenHistory={()=>setPage('history')} onOpenAnalytics={()=>setPage('analytics')}/>
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
                    {mode==='test' && <p className="text-sm text-gray-700">Allocated Time: {fmtTime(timeForQuestionsSec(total))}</p>}
                    {percent >= 80 && <p className="text-sm text-teal-700 mt-1">Great job! 🎉</p>}
                  </div>
                  <div className="flex gap-2">
                    {saved && <>
                      <button onClick={()=>exportAttemptCSV(saved)} className={glassBtn()}>Export Attempt CSV</button>
                      <button onClick={()=>exportAttemptPDF(saved)} className={glassBtn()}>Export Attempt PDF</button>
                    </>}
                    <button onClick={()=>setPage('home')} className={glassBtn()}>Home</button>
                  </div>
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

  /* ----------------- HISTORY ----------------- */
  if(page==='history'){
    const h = ls.get(); // fresh
    const [sortBy, setSortBy] = useState('date_desc');
    const sorted = [...h].sort((a,b)=>{
      if (sortBy==='date_desc') return new Date(b.timestamp)-new Date(a.timestamp);
      if (sortBy==='date_asc')  return new Date(a.timestamp)-new Date(b.timestamp);
      if (sortBy==='score_desc') return (b.percent||0)-(a.percent||0);
      if (sortBy==='score_asc')  return (a.percent||0)-(b.percent||0);
      return 0;
    });

    return (
      <>
        <TopBar page={page} onHome={()=>setPage('home')} total={0} attempted={0} mode={'practice'}
                onOpenHistory={()=>setPage('history')} onOpenAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Past Results</h2>
            <div className="flex gap-2">
              <select className="border rounded px-2 py-1" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="score_desc">Score high → low</option>
                <option value="score_asc">Score low → high</option>
              </select>
              <button onClick={()=>exportHistoryCSV(h)} className={glassBtn()}>Export History CSV</button>
            </div>
          </div>

          {sorted.length===0 ? (
            <div className="text-gray-500">No attempts yet.</div>
          ) : (
            <div className="space-y-4">
              {sorted.map((a) => (
                <details key={a.id} className="rounded-xl border bg-white/70 backdrop-blur p-4">
                  <summary className="cursor-pointer flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                      <div className="text-sm text-gray-700">Score: {a.score}/{a.total} ({a.percent}%) {a.durationSec?`• Time: ${fmtTime(a.durationSec)}`:''}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={(e)=>{e.preventDefault(); exportAttemptCSV(a);}} className={glassBtn()}>CSV</button>
                      <button onClick={(e)=>{e.preventDefault(); exportAttemptPDF(a);}} className={glassBtn()}>PDF</button>
                    </div>
                  </summary>

                  <div className="mt-3 space-y-2">
                    {a.questions.map((q,i)=>{
                      const your=a.answers[i]; const ok = your === q.answer;
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

  /* ----------------- ANALYTICS ----------------- */
  if(page==='analytics'){
    const h = ls.get();
    const rows = computeChapterStats(h);
    const maxTotal = rows.reduce((m,r)=>Math.max(m,r.total),0) || 1;

    return (
      <>
        <TopBar page={page} onHome={()=>setPage('home')} total={0} attempted={0} mode={'practice'}
                onOpenHistory={()=>setPage('history')} onOpenAnalytics={()=>setPage('analytics')} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Chapter-wise Analytics</h2>
            <div className="text-sm text-gray-600">Attempts analyzed: <b>{h.length}</b></div>
          </div>

          {rows.length===0 ? (
            <div className="text-gray-500">No data yet. Finish a test or practice session.</div>
          ) : (
            <div className="space-y-3">
              {rows.map(r=>(
                <div key={r.chapter} className="p-3 border rounded-xl bg-white/70 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{r.chapter}</div>
                    <div className="text-sm text-gray-700">{r.correct}/{r.total} correct • {r.pct}%</div>
                  </div>
                  <div className="mt-2 h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{width: `${r.pct}%`}} />
                  </div>
                  <div className="mt-1 text-xs text-gray-600">Volume: {r.total}
                    <span className="inline-block ml-2 align-middle h-2 w-full max-w-[200px] bg-gray-100 rounded">
                      <span className="block h-2 bg-rose-300 rounded" style={{width: `${(r.total/maxTotal)*100}%`}} />
                    </span>
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
