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
const timeForQuestionsSec = (n) => Math.ceil(n * 1.2 * 60); // 1.2 min per question

/* ----------------- UI pieces ----------------- */
function TopBar({ page, onHome, total, attempted, mode, remainingSec }) {
  const unattempted = Math.max(0, total - attempted);
  const mm = Math.floor(remainingSec/60);
  const ss = remainingSec%60;
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-base md:text-lg font-semibold">Economics MCQ Practice</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden md:inline text-muted">Total: <b>{total}</b></span>
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
      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: pct + '%' }} />
    </div>
  );
}

/* ----------------- App ----------------- */
const App = () => {
  const [page, setPage] = useState('home');     // 'home' | 'quiz' | 'result'
  const [mode, setMode] = useState('practice'); // 'practice' | 'test'
  const [questions, setQuestions] = useState([]);

  // active set shown in quiz (filtered by chapter or sampled for test)
  const [activeSet, setActiveSet] = useState([]);
  const [current, setCurrent] = useState(0);

  // answers & flags for activeSet indices
  const [answers, setAnswers] = useState({});         // { [i]: optionText }
  const [marked, setMarked]   = useState({});         // { [i]: boolean } mark for review
  const [skipped, setSkipped] = useState({});         // { [i]: boolean } set when leaving unanswered

  // home filters/inputs
  const [chapter, setChapter] = useState('All');
  const [testCount, setTestCount] = useState(10);

  // loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // timer
  const [remainingSec, setRemainingSec] = useState(0);
  const timerRef = useRef(null);

  // Load questions.json
  useEffect(() => {
    setLoading(true);
    fetch('questions.json?v=' + Date.now())
      .then(r => { if (!r.ok) throw new Error('Failed to load questions.json'); return r.json(); })
      .then(data => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(list);
        setLoading(false);
      })
      .catch(err => { console.error(err); setError('Could not load questions.json'); setLoading(false); });
  }, []);

  const chapters = useMemo(
    () => ['All', ...Array.from(new Set(questions.map(q => q.chapter).filter(Boolean)))],
    [questions]
  );

  // counts
  const total = activeSet.length;
  const attempted = useMemo(
    () => Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null).length,
    [answers]
  );
  const unattempted = Math.max(0, total - attempted);

  // navigation helpers
  const markSkippedIfUnanswered = (idx) => {
    const answered = answers[idx] != null;
    const isMarked = !!marked[idx];
    if (!answered && !isMarked) {
      setSkipped(prev => ({ ...prev, [idx]: true }));
    }
  };

  const goHome = () => {
    setPage('home');
    setCurrent(0);
    setAnswers({});
    setMarked({});
    setSkipped({});
    stopTimer();
    window.scrollTo(0,0);
  };

  const handleSelect = (opt) => {
    setAnswers(prev => ({ ...prev, [current]: opt }));
    // selecting an option removes "skipped" status
    setSkipped(prev => {
      if (!prev[current]) return prev;
      const copy = { ...prev };
      delete copy[current];
      return copy;
    });
  };

  const clearResponse = () => {
    setAnswers(prev => {
      if (prev[current] == null) return prev;
      const copy = { ...prev };
      delete copy[current];
      return copy;
    });
    // Red flag appears only after navigating away (skip logic).
  };

  const next = () => {
    markSkippedIfUnanswered(current);
    if (current < total - 1) setCurrent(c => c + 1);
  };

  const prev = () => {
    markSkippedIfUnanswered(current);
    if (current > 0) setCurrent(c => c - 1);
  };

  const goto = (i) => {
    markSkippedIfUnanswered(current);
    setCurrent(i);
  };

  // compute score
  const score = useMemo(() => {
    let s = 0;
    activeSet.forEach((q, i) => { if (answers[i] === q.answer) s++; });
    return s;
  }, [answers, activeSet]);

  // start flows
  const startPractice = () => {
    const filtered = (chapter === 'All') ? questions : questions.filter(q => q.chapter === chapter);
    setActiveSet(filtered);
    setCurrent(0);
    setAnswers({});
    setMarked({});
    setSkipped({});
    setPage('quiz');
    stopTimer();
    setRemainingSec(0);
    window.scrollTo(0,0);
  };

  const startTest = () => {
    const filtered = (chapter === 'All') ? questions : questions.filter(q => q.chapter === chapter);
    const n = Math.max(1, Math.min(parseInt(testCount || 1, 10), filtered.length));
    const selected = sampleN(filtered, n);
    setActiveSet(selected);
    setCurrent(0);
    setAnswers({});
    setMarked({});
    setSkipped({});
    setPage('quiz');
    // start timer
    const totalSec = timeForQuestionsSec(n);
    setRemainingSec(totalSec);
    startTimer();
    window.scrollTo(0,0);
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // auto submit
          setPage('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => { if (page !== 'quiz') stopTimer(); }, [page]);

  const submitNow = () => {
    // save attempt
    const history = ls.get();
    const percent = total ? Math.round((score / total) * 100) : 0;
    history.unshift({
      when: new Date().toISOString(),
      mode,
      filter: chapter,
      total,
      attempted,
      score,
      percent,
      time_used_sec: (mode==='test') ? (timeForQuestionsSec(total) - remainingSec) : null
    });
    ls.set(history.slice(0, 50));
    setPage('result');
    stopTimer();
    window.scrollTo(0,0);
  };

  /* ----------------- UI States ----------------- */
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
          <p className="text-center text-sm text-muted mt-2">
            Ensure <code>questions.json</code> is next to <code>index.html</code> and is valid JSON.
          </p>
        </main>
      </>
    );
  }

  /* ----------------- HOME ----------------- */
  if (page === 'home') {
    const history = ls.get();
    const filteredCount = (chapter === 'All') ? questions.length : questions.filter(q => q.chapter === chapter).length;
    const estSec = (mode === 'test') ? timeForQuestionsSec(Math.max(1, Math.min(testCount||1, filteredCount))) : 0;
    const estMM = Math.floor(estSec/60), estSS = estSec%60;

    return (
      <>
        <TopBar page={page} onHome={goHome} total={questions.length} attempted={0} mode={mode} remainingSec={0}/>
        <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          <section className="bg-white rounded-2xl shadow p-6">
            <h1 className="text-2xl font-semibold">MCQ Practice – CUET PG Economics</h1>

            <p className="text-muted mt-1">Practice chapter-wise Economics PYQs with instant feedback.</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border bg-gray-50">
                <div className="text-xs text-muted">Questions (All)</div>
                <div className="text-2xl font-bold">{questions.length}</div>
              </div>
              <div className="p-4 rounded-xl border bg-blue-50">
                <div className="text-xs text-blue-700">Chapters</div>
                <div className="text-2xl font-bold text-blue-700">
                  {Array.from(new Set(questions.map(q => q.chapter).filter(Boolean))).length}
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-emerald-50">
                <div className="text-xs text-emerald-700">Current Filter Count</div>
                <div className="text-2xl font-bold text-emerald-700">{filteredCount}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Chapter filter (Practice & Test)</label>
                <select
                  value={chapter}
                  onChange={(e)=>setChapter(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {['All', ...Array.from(new Set(questions.map(q => q.chapter).filter(Boolean)))].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Mode</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="mode" value="practice"
                      checked={mode==='practice'} onChange={()=>setMode('practice')} />
                    Practice (no timer)
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="mode" value="test"
                      checked={mode==='test'} onChange={()=>setMode('test')} />
                    Test (timer on)
                  </label>
                </div>
              </div>
            </div>

            {mode === 'test' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">How many questions do you want to attempt?</label>
                  <input
                    type="number" min="1" max={filteredCount || 1}
                    value={testCount}
                    onChange={(e)=>setTestCount(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                  <p className="text-xs text-muted mt-1">Available in filter: {filteredCount}</p>
                </div>
                <div className="flex items-end">
                  <div className="p-3 rounded border bg-gray-50 text-sm">
                    Estimated time: <b>{String(estMM).padStart(2,'0')}:{String(estSS).padStart(2,'0')}</b> (1.2 min per question)
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {mode === 'practice' ? (
                <button
                  disabled={!filteredCount}
                  onClick={startPractice}
                  className="bg-primary text-white px-5 py-2.5 rounded-lg shadow disabled:opacity-50"
                >Start Practice</button>
              ) : (
                <button
                  disabled={!filteredCount}
                  onClick={startTest}
                  className="bg-primary text-white px-5 py-2.5 rounded-lg shadow disabled:opacity-50"
                >Start Test</button>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Past Results</h3>
              <button onClick={()=>ls.set([])} className="text-sm text-red-600 hover:underline">Clear</button>
            </div>
            {ls.get().length === 0 ? (
              <p className="text-sm text-muted">No attempts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted">
                    <tr>
                      <th className="py-2 pr-4">When</th>
                      <th className="py-2 pr-4">Mode</th>
                      <th className="py-2 pr-4">Filter</th>
                      <th className="py-2 pr-4">Score</th>
                      <th className="py-2 pr-4">Attempted</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Time Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ls.get().map((h, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 pr-4">{new Date(h.when).toLocaleString()}</td>
                        <td className="py-2 pr-4 capitalize">{h.mode}</td>
                        <td className="py-2 pr-4">{h.filter}</td>
                        <td className="py-2 pr-4 font-medium">{h.score} ({h.percent}%)</td>
                        <td className="py-2 pr-4">{h.attempted}</td>
                        <td className="py-2 pr-4">{h.total}</td>
                        <td className="py-2 pr-4">{h.time_used_sec!=null ? `${Math.floor(h.time_used_sec/60)}m ${h.time_used_sec%60}s` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </>
    );
  }

  /* ----------------- QUIZ ----------------- */
  if (page === 'quiz') {
    const q = activeSet[current];
    const sel = answers[current];

    // palette status for each question
    const statusFor = (i) => {
      const answered = answers[i] != null;
      const isMarked = !!marked[i];
      const isSkipped = !!skipped[i];
      if (answered && isMarked) return 'attempted_marked'; // violet
      if (!answered && isMarked) return 'marked_only';     // blue
      if (!answered && isSkipped) return 'skipped';        // red
      if (answered) return 'attempted';                    // parrot green
      return 'unattempted';                                // white
    };

    const badgeClass = (s, i) => {
      const base = "w-8 h-8 rounded-md flex items-center justify-center text-sm border cursor-pointer";
      const ring = (i===current) ? " ring-2 ring-primary" : "";
      if (s === 'attempted_marked') return base + " bg-violet-500 text-white border-violet-600" + ring;
      if (s === 'marked_only')     return base + " bg-blue-500 text-white border-blue-600" + ring;
      if (s === 'skipped')         return base + " bg-red-500 text-white border-red-600" + ring;
      if (s === 'attempted')       return base + " bg-[#32CD32] text-white border-green-600" + ring;
      return base + " bg-white text-gray-700 border-gray-300" + ring; // unattempted
    };

    return (
      <>
        <TopBar page={page} onHome={goHome} total={total} attempted={attempted} mode={mode} remainingSec={remainingSec}/>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
            {/* left: question card */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm text-muted">Question {current + 1} of {total}</div>
                <div className="w-1/2"><ProgressBar currentIndex={current} total={total} /></div>
              </div>

              <section className="bg-white rounded-2xl shadow p-6">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted">Chapter</div>
                <div className="mb-4 text-base font-medium">{q.chapter || '—'}</div>

                <h3 className="text-lg font-semibold leading-relaxed">{q.question}</h3>
                {q.source && <div className="mt-1 text-xs text-muted">Source: {q.source}</div>}

                <div className="mt-5 grid gap-3">
                  {q.options.map((opt, idx) => {
                    const active = sel === opt;
                    return (
                      <label key={idx}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition
                                   ${active ? 'border-primary bg-primary/10' : 'hover:bg-gray-50'}`}>
                        <input
                          type="radio"
                          name={`q-${current}`}  // unique name per question
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

                {/* toolbar (updated layout) */}
                <div className="mt-6 flex items-center gap-3">
                  {/* LEFT GROUP: Previous + Clear + Mark */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={prev}
                      disabled={current === 0}
                      className="px-4 py-2 rounded-lg border disabled:opacity-50"
                    >
                      Previous
                    </button>

                    <button
                      onClick={clearResponse}
                      className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                      title="Clear the selected option"
                    >
                      Clear Response
                    </button>

                    <button
                      onClick={() => setMarked(prev => ({ ...prev, [current]: !prev[current] }))}
                      className={`px-4 py-2 rounded-lg border ${marked[current] ? 'bg-violet-600 text-white border-violet-700' : 'hover:bg-gray-50'}`}
                    >
                      {marked[current] ? 'Unmark Review' : 'Mark for Review'}
                    </button>
                  </div>

                  {/* Spacer pushes right group */}
                  <div className="flex-1" />

                  {/* RIGHT GROUP: stats + Next/Submit */}
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted">
                      Attempted: <b>{attempted}</b> &nbsp;|&nbsp; Unattempted: <b>{unattempted}</b>
                    </div>

                    {current < total - 1 ? (
                      <button
                        onClick={next}
                        className="px-4 py-2 rounded-lg bg-primary text-white"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={submitNow}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white"
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* right: palette */}
            <aside className="lg:sticky lg:top-[72px]">
              <div className="bg-white rounded-2xl shadow p-4">
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
                    return (
                      <button key={i} className={badgeClass(s, i)} onClick={()=>goto(i)} title={`Go to Q${i+1}`}>
                        {i+1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-white border border-gray-300"></span> Unattempted
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-[#32CD32] border border-green-600"></span> Attempted
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-blue-500 border border-blue-600"></span> Marked (no answer)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-violet-500 border border-violet-600"></span> Attempted + Marked
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-500 border border-red-600"></span> Skipped
                  </div>
                </div>

                <div className="mt-4">
                  <button onClick={submitNow} className="w-full px-4 py-2 rounded-lg bg-green-600 text-white">
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
  if (page === 'result') {
    const percent = total ? Math.round((score / total) * 100) : 0;
    return (
      <>
        <TopBar page={page} onHome={goHome} total={total} attempted={attempted} mode={mode} remainingSec={remainingSec}/>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <section className="bg-white rounded-2xl shadow p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Results</h2>
                <p className="text-sm text-muted mt-1">
                  Score: <b>{score}</b> / {total} &nbsp;({percent}%)
                </p>
                {mode==='test' && (
                  <p className="text-sm text-muted mt-1">
                    Time used: <b>{Math.floor((timeForQuestionsSec(total)-remainingSec)/60)}m {(timeForQuestionsSec(total)-remainingSec)%60}s</b>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg border" onClick={goHome}>Home</button>
                <button className="px-4 py-2 rounded-lg bg-primary text-white"
                        onClick={() => { setPage('quiz'); setCurrent(0); window.scrollTo(0,0); }}>
                  Review
                </button>
              </div>
            </div>

            <hr className="my-6"/>

            <div className="space-y-5">
              {activeSet.map((q, i) => {
                const sel = answers[i];
                const correct = sel === q.answer;
                return (
                  <div key={i} className="p-4 border rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm text-muted">
                        <div className="uppercase tracking-wide text-xs">Chapter</div>
                        <div className="font-medium">{q.chapter || '—'}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {correct ? 'Correct' : 'Incorrect'}
                      </div>
                    </div>

                    <div className="mt-2 font-semibold">Q{i+1}. {q.question}</div>
                    <div className="mt-2 text-sm">
                      Your answer: <b>{sel ?? 'Not answered'}</b> &nbsp;|&nbsp; Correct: <b className="text-green-700">{q.answer}</b>
                    </div>
                    {q.explanation && (
                      <div className="mt-3 text-sm p-3 rounded bg-gray-50">
                        <div className="font-medium mb-1">Explanation</div>
                        <p className="text-muted">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </>
    );
  }

  return null;
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
