const { useEffect, useMemo, useState } = React;

/* ----------------- localStorage helper ----------------- */
const LS_KEY = "econ_mcq_history_v1";
const ls = {
  get() { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};

/* ----------------- UI pieces ----------------- */
function TopBar({ page, onHome, total, attempted }) {
  const unattempted = Math.max(0, total - attempted);
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-base md:text-lg font-semibold">Economics MCQ Practice</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-muted">Total: <b>{total}</b></span>
          <span className="hidden sm:inline text-green-700">Attempted: <b>{attempted}</b></span>
          <span className="hidden sm:inline text-amber-700">Unattempted: <b>{unattempted}</b></span>
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
  const [questions, setQuestions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});   // { [indexInFiltered]: optionText }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chapter, setChapter] = useState('All');

  // Load questions.json with cache-buster
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

  // Chapters + filtering
  const chapters = useMemo(
    () => ['All', ...Array.from(new Set(questions.map(q => q.chapter).filter(Boolean)))],
    [questions]
  );

  useEffect(() => {
    if (chapter === 'All') setFiltered(questions);
    else setFiltered(questions.filter(q => q.chapter === chapter));
    setAnswers({});
    setCurrent(0);
  }, [chapter, questions]);

  const total = filtered.length;
  const attempted = useMemo(
    () => Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null).length,
    [answers]
  );
  const unattempted = Math.max(0, total - attempted);

  const goHome = () => { setPage('home'); setCurrent(0); window.scrollTo(0,0); };
  const startTest = () => { if (total) { setPage('quiz'); setCurrent(0); window.scrollTo(0,0); } };

  const handleSelect = (opt) => setAnswers(prev => ({ ...prev, [current]: opt }));
  const next = () => { if (current < total - 1) setCurrent(c => c + 1); };
  const prev = () => { if (current > 0) setCurrent(c => c - 1); };

  const score = useMemo(() => {
    let s = 0;
    filtered.forEach((q, i) => { if (answers[i] === q.answer) s++; });
    return s;
  }, [answers, filtered]);

  const submit = () => {
    const attempt = {
      when: new Date().toISOString(),
      filter: chapter,
      total,
      attempted,
      score,
      percent: total ? Math.round((score / total) * 100) : 0
    };
    const history = ls.get();
    history.unshift(attempt);
    ls.set(history.slice(0, 30));
    setPage('result');
    window.scrollTo(0,0);
  };

  /* -------- States -------- */
  if (loading) {
    return (
      <>
        <TopBar page={page} onHome={goHome} total={0} attempted={0} />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="text-center text-lg text-gray-500">Loading questions…</div>
        </main>
      </>
    );
  }
  if (error) {
    return (
      <>
        <TopBar page={page} onHome={goHome} total={0} attempted={0} />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="text-center text-red-600">{error}</div>
          <p className="text-center text-sm text-muted mt-2">
            Ensure <code>questions.json</code> is next to <code>index.html</code> and is valid JSON.
          </p>
        </main>
      </>
    );
  }

  /* -------- HOME -------- */
  if (page === 'home') {
    const history = ls.get();
    return (
      <>
        <TopBar page={page} onHome={goHome} total={questions.length} attempted={0} />
        <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
          <section className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-semibold">Economics MCQ Practice – CUET | DSE | JNU | UOH</h2>
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
                <div className="text-xs text-emerald-700">Selected set</div>
                <div className="text-2xl font-bold text-emerald-700">{total}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm text-muted mb-1">Chapter filter</label>
                <select
                  value={chapter}
                  onChange={(e)=>setChapter(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                disabled={!total}
                onClick={startTest}
                className="bg-primary text-white px-5 py-2.5 rounded-lg shadow disabled:opacity-50"
              >
                Start Test
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Past Results</h3>
              <button onClick={()=>ls.set([])} className="text-sm text-red-600 hover:underline">Clear</button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted">No attempts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted">
                    <tr>
                      <th className="py-2 pr-4">When</th>
                      <th className="py-2 pr-4">Filter</th>
                      <th className="py-2 pr-4">Score</th>
                      <th className="py-2 pr-4">Attempted</th>
                      <th className="py-2 pr-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 pr-4">{new Date(h.when).toLocaleString()}</td>
                        <td className="py-2 pr-4">{h.filter}</td>
                        <td className="py-2 pr-4 font-medium">{h.score} ({h.percent}%)</td>
                        <td className="py-2 pr-4">{h.attempted}</td>
                        <td className="py-2 pr-4">{h.total}</td>
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

  /* -------- QUIZ -------- */
  if (page === 'quiz') {
    const q = filtered[current];
    const sel = answers[current];

    return (
      <>
        <TopBar page={page} onHome={goHome} total={total} attempted={attempted} />
        <main className="max-w-5xl mx-auto px-4 py-6">
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
                      onChange={() => setAnswers(prev => ({ ...prev, [current]: opt }))}
                    />
                    <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={()=> current>0 && setCurrent(c=>c-1)}
                      disabled={current === 0}
                      className="px-4 py-2 rounded-lg border disabled:opacity-50">Previous</button>

              <div className="text-sm text-muted">
                Attempted: <b>{attempted}</b> &nbsp;|&nbsp; Unattempted: <b>{unattempted}</b>
              </div>

              {current < total - 1 ? (
                <button onClick={()=> setCurrent(c=>c+1)}
                        className="px-4 py-2 rounded-lg bg-primary text-white">Next</button>
              ) : (
                <button onClick={submit}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white">Submit</button>
              )}
            </div>
          </section>
        </main>
      </>
    );
  }

  /* -------- RESULT -------- */
  if (page === 'result') {
    const percent = total ? Math.round((score / total) * 100) : 0;
    return (
      <>
        <TopBar page={page} onHome={goHome} total={total} attempted={attempted} />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <section className="bg-white rounded-2xl shadow p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Results</h2>
                <p className="text-sm text-muted mt-1">
                  Score: <b>{score}</b> / {total} &nbsp;({percent}%)
                </p>
                <p className="text-sm text-muted mt-1">
                  Attempted: <b>{attempted}</b> &nbsp;|&nbsp; Unattempted: <b>{Math.max(0,total-attempted)}</b>
                </p>
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
              {filtered.map((q, i) => {
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
