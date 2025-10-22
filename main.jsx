const { useEffect, useMemo, useState, useRef } = React;

/* ----------------- localStorage (history) ----------------- */
const LS_KEY = "econ_mcq_history_v2";
const ls = {
  get() { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};

/* ----------------- helpers ----------------- */
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i=a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sampleN = (arr, n) => shuffle(arr).slice(0, n);
const timeForQuestionsSec = (n) => Math.ceil(n * 1.2 * 60);

/* ----------------- Background for Home & Result ----------------- */
function BackgroundImage() {
  return (
    <>
      <div className="absolute inset-0 bg-[url('./ganesh.png')] bg-no-repeat bg-center bg-fixed opacity-10"></div>
      <div className="absolute inset-0 bg-red-50/30"></div>
    </>
  );
}

/* ----------------- UI pieces ----------------- */
function TopBar({ page, onHome, total, attempted, mode, remainingSec }) {
  const unattempted = Math.max(0, total - attempted);
  const mm = Math.floor(remainingSec/60);
  const ss = remainingSec%60;
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-base md:text-lg font-semibold">MCQ Practice – CUET PG Economics</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden md:inline text-gray-500">Total: <b>{total}</b></span>
          <span className="hidden md:inline text-green-700">Attempted: <b>{attempted}</b></span>
          <span className="hidden md:inline text-amber-700">Unattempted: <b>{unattempted}</b></span>
          {mode === 'test' && page === 'quiz' && (
            <span className={`px-2 py-1 rounded border ${remainingSec<=30 ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-700'}`}>
              ⏱ {String(mm).padStart(2,'0')}:{String(ss).padStart(2,'0')}
            </span>
          )}
          {page !== 'home' && (
            <button onClick={onHome} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Home</button>
          )}
        </div>
      </div>
    </header>
  );
}

function ProgressBar({ currentIndex, total }) {
  const pct = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  return (
    <div className="w-full bg-gray-200/70 h-2 rounded-full">
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

  /* load questions */
  useEffect(() => {
    fetch('questions.json?v=' + Date.now())
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(list);
        setLoading(false);
      })
      .catch(() => { setError('Could not load questions.json'); setLoading(false); });
  }, []);

  const total = activeSet.length;
  const attempted = useMemo(
    () => Object.keys(answers).filter(k => answers[k] != null).length, [answers]);
  const unattempted = Math.max(0, total - attempted);

  const markSkippedIfUnanswered = (i) => {
    if (!answers[i] && !marked[i]) setSkipped(p => ({...p, [i]: true}));
  };
  const handleSelect = (opt) => {
    setAnswers(p => ({...p, [current]: opt}));
    setSkipped(p => { const c={...p}; delete c[current]; return c; });
  };
  const clearResponse = () => setAnswers(p => { const c={...p}; delete c[current]; return c; });
  const prev = () => { markSkippedIfUnanswered(current); if (current>0) setCurrent(c=>c-1); };
  const next = () => { markSkippedIfUnanswered(current); if (current<total-1) setCurrent(c=>c+1); };
  const goto = (i) => { markSkippedIfUnanswered(current); setCurrent(i); };
  const goHome = () => { setPage('home'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); stopTimer(); };

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
  const stopTimer = ()=>{ if(timerRef.current){clearInterval(timerRef.current);} };

  const startPractice = () => {
    const f = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    setActiveSet(f); setPage('quiz'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); stopTimer();
  };
  const startTest = () => {
    const f = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const n=Math.min(parseInt(testCount||1),f.length);
    const s=sampleN(f,n);
    setActiveSet(s); setPage('quiz'); setCurrent(0); setAnswers({}); setMarked({}); setSkipped({});
    startTimer(timeForQuestionsSec(n));
  };

  const score = useMemo(()=>activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[answers,activeSet]);
  const submitNow = () => { stopTimer(); setPage('result'); };

  /* ----------------- HOME ----------------- */
  if(page==='home'){
    const filteredCount=chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const est=timeForQuestionsSec(Math.min(testCount,filteredCount));
    const mm=Math.floor(est/60),ss=est%60;
    return(
      <>
        <TopBar page={page} onHome={goHome} total={questions.length} attempted={0} mode={mode}/>
        <div className="relative min-h-screen">
          <BackgroundImage/>
          <main className="relative max-w-6xl mx-auto px-4 py-10 space-y-8">
            <section className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-semibold">MCQ Practice – CUET PG Economics</h2>
              <p className="text-gray-500 mt-1">Practice chapter-wise Economics PYQs with instant feedback.</p>
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Chapter Filter</label>
                  <select value={chapter} onChange={e=>setChapter(e.target.value)} className="w-full p-2 border rounded-lg">
                    {['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Mode</label>
                  <div className="flex gap-4">
                    <label><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')}/> Practice</label>
                    <label><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')}/> Test</label>
                  </div>
                </div>
              </div>
              {mode==='test'&&(
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">No. of Questions</label>
                    <input type="number" value={testCount} onChange={e=>setTestCount(e.target.value)} className="w-full p-2 border rounded-lg"/>
                    <p className="text-xs text-gray-500 mt-1">Available: {filteredCount}</p>
                  </div>
                  <div className="flex items-end">
                    <div className="p-2 border rounded bg-gray-50 text-sm">Estimated Time : {mm}:{String(ss).padStart(2,'0')}</div>
                  </div>
                </div>
              )}
              <div className="mt-6">
                {mode==='practice'?(
                  <button onClick={startPractice} className="bg-teal-600 text-white px-5 py-2 rounded">Start Practice</button>
                ):(
                  <button onClick={startTest} className="bg-teal-600 text-white px-5 py-2 rounded">Start Test</button>
                )}
              </div>
            </section>
          </main>
        </div>
      </>
    );
  }

  /* ----------------- QUIZ ----------------- */
  if(page==='quiz'){
    const q=activeSet[current]; const sel=answers[current];
    const statusFor=(i)=>{const a=answers[i]!=null,m=marked[i],s=skipped[i];if(a&&m)return'violet';if(!a&&m)return'blue';if(!a&&s)return'red';if(a)return'green';return'white';};
    const btnColor=(st)=>({
      violet:'bg-violet-500 text-white',blue:'bg-blue-500 text-white',red:'bg-red-500 text-white',green:'bg-[#32CD32] text-white',white:'bg-white text-gray-700'
    }[st]);
    return(
      <>
        <TopBar page={page} onHome={goHome} total={total} attempted={attempted} mode={mode} remainingSec={remainingSec}/>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,260px] gap-6">
            <div>
              <div className="flex justify-between mb-3"><div>Question {current+1}/{total}</div><div className="w-1/2"><ProgressBar currentIndex={current} total={total}/></div></div>
              <div className="bg-white rounded-2xl shadow p-6">
                <div className="text-xs text-gray-500 uppercase mb-2">Chapter</div>
                <div className="mb-3 font-medium">{q.chapter}</div>
                <h3 className="font-semibold">{q.question}</h3>
                <div className="mt-4 space-y-2">
                  {q.options.map((opt,i)=>(
                    <label key={i} className={`flex items-center gap-2 p-3 border rounded cursor-pointer ${sel===opt?'border-teal-500 bg-teal-50':'hover:bg-gray-50'}`}>
                      <input type="radio" name={`q-${current}`} checked={sel===opt} onChange={()=>handleSelect(opt)} className="accent-teal-500"/><b>{String.fromCharCode(65+i)}.</b>{opt}
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={prev} disabled={current===0} className="px-4 py-2 border rounded disabled:opacity-50">Previous</button>
                    <button onClick={clearResponse} className="px-4 py-2 border rounded hover:bg-gray-50">Clear Response</button>
                    <button onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))} className={`px-4 py-2 border rounded ${marked[current]?'bg-violet-600 text-white':''}`}>{marked[current]?'Unmark':'Mark Review'}</button>
                  </div>
                  <div className="flex-1"/>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">Attempted <b>{attempted}</b> | Unattempted <b>{unattempted}</b></div>
                    {current<total-1?
                      <button onClick={next} className="px-4 py-2 bg-teal-600 text-white rounded">Next</button>:
                      <button onClick={submitNow} className="px-4 py-2 bg-green-600 text-white rounded">Submit</button>}
                  </div>
                </div>
              </div>
            </div>
            <aside className="lg:sticky top-20">
              <div className="bg-white rounded-2xl shadow p-4">
                <h4 className="font-semibold mb-2">Question Palette</h4>
                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_,i)=>(
                    <button key={i} onClick={()=>goto(i)} className={`w-8 h-8 border rounded ${btnColor(statusFor(i))}`}>{i+1}</button>
                  ))}
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
        <TopBar page={page} onHome={goHome} total={total} attempted={attempted} mode={mode}/>
        <div className="relative min-h-screen">
          <BackgroundImage/>
          <main className="relative max-w-6xl mx-auto px-4 py-8">
            <section className="bg-white rounded-2xl shadow p-6">
              <div className="flex justify-between mb-4">
                <div><h2 className="text-xl font-semibold">Result</h2>
                  <p>Score : {score}/{total} ({percent}%)</p></div>
                <button onClick={goHome} className="px-4 py-2 border rounded">Home</button>
              </div>
              {activeSet.map((q,i)=>{
                const sel=answers[i];const ok=sel===q.answer;
                return(
                  <div key={i} className="p-3 mb-3 border rounded">
                    <div className="flex justify-between"><b>Q{i+1}. {q.question}</b>
                      <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{ok?'Correct':'Incorrect'}</span></div>
                    <p className="text-sm">Your: {sel||'Not answered'} | Correct: <b className="text-green-700">{q.answer}</b></p>
                    {q.explanation && <p className="text-sm text-gray-600 mt-1">{q.explanation}</p>}
                  </div>
                );
              })}
            </section>
          </main>
        </div>
      </>
    );
  }
  return null;
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
