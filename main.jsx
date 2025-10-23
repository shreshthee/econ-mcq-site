/* EconoLearn – full working engine
   - Home: chapter filter, practice/test, count, ETA
   - Quiz: one-by-one, mark for review, clear, skip -> red, counts
   - Timer in test mode (N × 1.2 min)
   - Results: score + detailed review
   - History (localStorage) & simple analytics
*/

const { useEffect, useMemo, useRef, useState } = React;

/* ---------- helpers ---------- */
const pad = (n) => String(n).padStart(2, "0");
const minutesToHMS = (mins) => {
  const total = Math.round(mins * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sampleN = (arr, n) => shuffle(arr).slice(0, Math.min(n, arr.length));

/* ---------- storage keys ---------- */
const LS_HISTORY = "econo_history_v1";

/* ---------- App root ---------- */
function App() {
  const [page, setPage] = useState("home"); // home | quiz | result | history | analytics
  const [questions, setQuestions] = useState([]);
  const [chapters, setChapters] = useState(["All"]);
  const [loadingQ, setLoadingQ] = useState(true);

  // Home selections
  const [home, setHome] = useState({
    chapter: "All",
    mode: "practice",
    count: 10,
  });

  // Active quiz state
  const [quiz, setQuiz] = useState({
    list: [],
    idx: 0,
    answers: {}, // index -> selectedOption
    marked: {}, // index -> boolean
    skipped: {}, // index -> boolean (when next pressed without answer)
    timer: 0, // seconds left (test mode)
    timerOn: false,
    mode: "practice",
  });

  // Result state
  const [result, setResult] = useState(null); // {score,total,items:[...]}

  // Load questions.json
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("questions.json?v=" + Date.now());
        const data = await r.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(list);
        const setC = Array.from(new Set(list.map(q => q.chapter).filter(Boolean))).sort();
        setChapters(["All", ...setC]);
      } catch (e) {
        console.error("Failed to load questions.json", e);
        setQuestions([]);
        setChapters(["All"]);
      } finally {
        setLoadingQ(false);
      }
    })();
  }, []);

  /* ---------- computed ---------- */
  const filtered = useMemo(() => {
    if (home.chapter === "All") return questions;
    return questions.filter(q => q.chapter === home.chapter);
  }, [home.chapter, questions]);

  const eta = minutesToHMS((home.count || 0) * 1.2);

  /* ---------- navigation actions ---------- */
  const startQuiz = () => {
    if (!filtered.length) {
      alert("No questions available for this chapter.");
      return;
    }
    let list = filtered;
    if (home.mode === "test") {
      list = sampleN(filtered, Number(home.count || 0));
    }
    if (list.length === 0) {
      alert("No questions selected.");
      return;
    }
    const secs = home.mode === "test" ? Math.round((list.length * 1.2) * 60) : 0;
    setQuiz({
      list,
      idx: 0,
      answers: {},
      marked: {},
      skipped: {},
      timer: secs,
      timerOn: home.mode === "test",
      mode: home.mode,
    });
    setPage("quiz");
  };

  const viewHistory = () => setPage("history");
  const viewAnalytics = () => setPage("analytics");

  /* ---------- render pages ---------- */
  if (page === "home") {
    return (
      <HomePage
        loading={loadingQ}
        chapters={chapters}
        available={filtered.length}
        home={home}
        setHome={setHome}
        eta={eta}
        onStart={startQuiz}
        onHistory={viewHistory}
        onAnalytics={viewAnalytics}
      />
    );
  }
  if (page === "quiz") {
    return (
      <QuizPage
        quiz={quiz}
        setQuiz={setQuiz}
        onSubmit={(res) => { setResult(res); setPage("result"); }}
        onBack={() => setPage("home")}
      />
    );
  }
  if (page === "result") {
    return (
      <ResultPage
        result={result}
        onHome={() => setPage("home")}
        onHistory={() => setPage("history")}
      />
    );
  }
  if (page === "history") {
    return <HistoryPage onHome={() => setPage("home")} />;
  }
  if (page === "analytics") {
    return <AnalyticsPage questions={questions} onHome={() => setPage("home")} />;
  }
  return null;
}

/* ---------- Home ---------- */
function HomePage({ loading, chapters, available, home, setHome, eta, onStart, onHistory, onAnalytics }) {
  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto max-w-5xl px-4">
        {/* card */}
        <div className="mt-10 sm:mt-14 bg-rose-100/55 backdrop-blur-xl border border-white/70 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,.06)]">
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl sm:text-[28px] font-semibold text-gray-900">
              EconoLearn – MCQ Practice for CUET PG Economics
            </h2>
            <p className="text-gray-700 mt-2">
              Practice chapter-wise Economics PYQs with instant feedback.
            </p>

            {/* chapter */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Chapter Filter</label>
              <div className="relative z-50">
                <select
                  value={home.chapter}
                  disabled={loading}
                  onChange={(e) => setHome(p => ({ ...p, chapter: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-white/70 bg-white/80 backdrop-blur px-3 py-2 pr-10 shadow-[0_8px_24px_rgba(0,0,0,.05)] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                >
                  {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
              </div>
            </div>

            {/* mode */}
            <div className="mt-6">
              <span className="block text-sm font-semibold text-gray-800 mb-2">Mode</span>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={home.mode === "practice"}
                    onChange={() => setHome(p => ({ ...p, mode: "practice" }))}
                  />
                  <span>Practice</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={home.mode === "test"}
                    onChange={() => setHome(p => ({ ...p, mode: "test" }))}
                  />
                  <span>Test</span>
                </label>
              </div>
            </div>

            {/* count + ETA */}
            <div className="mt-6 grid sm:grid-cols-[1fr_auto] items-end gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">No. of Questions</label>
                <input
                  type="number"
                  min="1"
                  value={home.count}
                  onChange={(e) => setHome(p => ({ ...p, count: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-white/70 bg-white/80 backdrop-blur px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,.05)] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                />
                <p className="text-sm text-gray-600 mt-1">Available: {available}</p>
              </div>
              <div className="sm:mb-1 text-sm text-gray-700">
                Estimated Time: <span className="font-semibold">{eta}</span>
              </div>
            </div>

            {/* buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-teal-600 text-white px-5 py-2 shadow hover:bg-teal-700 transition"
                onClick={onStart}
              >
                {home.mode === 'practice' ? 'Start Practice' : 'Start Test'}
              </button>
              <button
                className="rounded-xl border border-white/70 bg-white/80 backdrop-blur px-5 py-2 shadow hover:bg-white transition"
                onClick={onHistory}
              >
                Review Past Results
              </button>
              <button
                className="rounded-xl border border-white/70 bg-white/80 backdrop-blur px-5 py-2 shadow hover:bg-white transition"
                onClick={onAnalytics}
              >
                Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Quiz ---------- */
function QuizPage({ quiz, setQuiz, onSubmit, onBack }) {
  const q = quiz.list[quiz.idx];
  const total = quiz.list.length;

  // timer
  useEffect(() => {
    if (!quiz.timerOn) return;
    if (quiz.timer <= 0) {
      handleSubmit();
      return;
    }
    const id = setTimeout(() => {
      setQuiz(p => ({ ...p, timer: p.timer - 1 }));
    }, 1000);
    return () => clearTimeout(id);
  }, [quiz.timerOn, quiz.timer]);

  const hhmmss = () => {
    const t = quiz.timer;
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const select = (opt) => {
    setQuiz(p => ({
      ...p,
      answers: { ...p.answers, [p.idx]: opt },
      skipped: { ...p.skipped, [p.idx]: false }
    }));
  };

  const next = () => {
    setQuiz(p => {
      const sel = p.answers[p.idx];
      const skipped = !sel;
      const newSkipped = { ...p.skipped, [p.idx]: skipped };
      const newIdx = Math.min(p.idx + 1, total - 1);
      return { ...p, idx: newIdx, skipped: newSkipped };
    });
  };

  const prev = () => setQuiz(p => ({ ...p, idx: Math.max(0, p.idx - 1) }));

  const toggleMark = () => {
    setQuiz(p => ({
      ...p,
      marked: { ...p.marked, [p.idx]: !p.marked[p.idx] }
    }));
  };

  const clearResp = () => {
    setQuiz(p => {
      const a = { ...p.answers }; delete a[p.idx];
      return { ...p, answers: a };
    });
  };

  const jumpTo = (i) => setQuiz(p => ({ ...p, idx: i }));

  const attempted = Object.keys(quiz.answers).length;
  const unattempted = total - attempted;

  const handleSubmit = () => {
    const items = quiz.list.map((qq, i) => {
      const sel = quiz.answers[i];
      const correct = sel === qq.answer;
      return { ...qq, selected: sel || null, correct };
    });
    const score = items.reduce((acc, it) => acc + (it.correct ? 1 : 0), 0);
    // Save history
    const entry = {
      id: Date.now(),
      when: new Date().toISOString(),
      mode: quiz.mode,
      total,
      score,
      chapter: inferChapter(items),
    };
    const hist = JSON.parse(localStorage.getItem(LS_HISTORY) || "[]");
    hist.unshift(entry);
    localStorage.setItem(LS_HISTORY, JSON.stringify(hist));
    onSubmit({ score, total, items });
  };

  const inferChapter = (items) => {
    const m = new Map();
    items.forEach(it => m.set(it.chapter, (m.get(it.chapter) || 0) + 1));
    const top = [...m.entries()].sort((a,b)=>b[1]-a[1])[0];
    return top ? top[0] : "Mixed";
  };

  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onBack} className="rounded border px-3 py-1 hover:bg-gray-50">Home</button>
          <div className="text-sm text-gray-700">
            Question <b>{quiz.idx + 1}</b> of <b>{total}</b>
            {quiz.mode === "test" && (
              <span className="ml-4 inline-block rounded bg-teal-600 text-white px-2 py-0.5">
                {hhmmss()}
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* left: question */}
          <div className="bg-white/90 backdrop-blur rounded-2xl border border-white/70 shadow p-5">
            <div className="text-sm text-gray-600">{q.chapter} • {q.source}</div>
            <h3 className="mt-2 text-lg font-semibold">{q.question}</h3>
            <div className="mt-4 space-y-3">
              {q.options.map((opt, idx) => (
                <label key={idx} className={`block rounded border px-3 py-2 cursor-pointer
                  ${quiz.answers[quiz.idx] === opt ? 'bg-teal-50 border-teal-500' : 'bg-white'}`}>
                  <input
                    type="radio"
                    name={`q-${quiz.idx}`}
                    className="mr-2"
                    checked={quiz.answers[quiz.idx] === opt}
                    onChange={() => select(opt)}
                  />
                  <b>{String.fromCharCode(65 + idx)}.</b> {opt}
                </label>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <button onClick={prev} disabled={quiz.idx === 0}
                className="rounded border px-4 py-2 disabled:opacity-50">Previous</button>

              <button onClick={toggleMark}
                className={`rounded border px-4 py-2 ${quiz.marked[quiz.idx] ? 'bg-purple-100 border-purple-400' : ''}`}>
                {quiz.marked[quiz.idx] ? 'Unmark' : 'Mark for Review'}
              </button>

              <button onClick={clearResp} className="rounded border px-4 py-2">Clear Response</button>

              {quiz.idx < total - 1 ? (
                <button onClick={next} className="ml-auto rounded bg-teal-600 text-white px-4 py-2">Next</button>
              ) : (
                <button onClick={handleSubmit} className="ml-auto rounded bg-green-600 text-white px-4 py-2">Submit</button>
              )}

              <div className="ml-2 text-sm text-gray-700">
                Attempted: <b>{attempted}</b> &nbsp;|&nbsp; Unattempted: <b>{unattempted}</b>
              </div>
            </div>
          </div>

          {/* right: palette */}
          <div className="bg-white/90 backdrop-blur rounded-2xl border border-white/70 shadow p-4">
            <h4 className="font-semibold mb-3">Question Palette</h4>
            <div className="grid grid-cols-8 gap-2 text-sm">
              {quiz.list.map((_, i) => {
                const sel = quiz.answers[i];
                const marked = quiz.marked[i];
                const skipped = quiz.skipped[i];
                let cls = "border-gray-300 text-gray-700";
                if (sel) cls = "bg-blue-100 border-blue-400 text-blue-800"; // attempted -> blue
                if (marked && sel) cls = "bg-purple-100 border-purple-400 text-purple-800"; // attempted+marked -> purple
                if (marked && !sel) cls = "bg-violet-100 border-violet-400 text-violet-800"; // marked only -> violet
                if (skipped) cls = "bg-red-100 border-red-400 text-red-800"; // skipped -> red
                const active = i === quiz.idx ? "ring-2 ring-teal-400" : "";
                return (
                  <button key={i}
                    onClick={() => jumpTo(i)}
                    className={`rounded border px-2 py-1 ${cls} ${active}`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-gray-600 space-y-1">
              <div><span className="inline-block w-3 h-3 rounded border border-gray-300 align-middle mr-2"></span> Not visited</div>
              <div><span className="inline-block w-3 h-3 rounded align-middle mr-2 bg-blue-100 border border-blue-400"></span> Attempted</div>
              <div><span className="inline-block w-3 h-3 rounded align-middle mr-2 bg-violet-100 border border-violet-400"></span> Marked</div>
              <div><span className="inline-block w-3 h-3 rounded align-middle mr-2 bg-purple-100 border border-purple-400"></span> Attempted + Marked</div>
              <div><span className="inline-block w-3 h-3 rounded align-middle mr-2 bg-red-100 border border-red-400"></span> Skipped</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Result ---------- */
function ResultPage({ result, onHome, onHistory }) {
  if (!result) return null;
  const pct = Math.round((result.score / result.total) * 100);

  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onHome} className="rounded border px-3 py-1 hover:bg-gray-50">Home</button>
          <button onClick={onHistory} className="rounded border px-3 py-1 hover:bg-gray-50">Review Past Results</button>
        </div>

        <div className="bg-white/90 backdrop-blur rounded-2xl border border-white/70 shadow p-6">
          <div className="text-3xl font-bold">{result.score}/{result.total}</div>
          <div className="text-gray-600">Score: {pct}%</div>
        </div>

        <div className="mt-4 space-y-4">
          {result.items.map((it, i) => {
            const correct = it.selected === it.answer;
            return (
              <div key={i} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Q{i + 1}. {it.question}</p>
                  <span className={`text-xs px-2 py-1 rounded ${correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{it.chapter} • {it.source}</p>
                <p className="mt-2 text-sm">Your answer: <b>{it.selected ?? 'Not answered'}</b></p>
                <p className="text-sm text-green-700">Correct: <b>{it.answer}</b></p>
                {it.explanation && <p className="text-sm text-gray-700 mt-2">{it.explanation}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- History (localStorage) ---------- */
function HistoryPage({ onHome }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const h = JSON.parse(localStorage.getItem(LS_HISTORY) || "[]");
    setRows(h);
  }, []);

  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onHome} className="rounded border px-3 py-1 hover:bg-gray-50">Home</button>
          <h2 className="text-xl font-semibold">Past Results</h2>
        </div>

        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Mode</th>
                <th className="text-left px-3 py-2">Chapter</th>
                <th className="text-left px-3 py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td className="px-3 py-3 text-gray-500" colSpan="4">No history yet.</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{new Date(r.when).toLocaleString()}</td>
                  <td className="px-3 py-2 capitalize">{r.mode}</td>
                  <td className="px-3 py-2">{r.chapter}</td>
                  <td className="px-3 py-2">{r.score}/{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ---------- Analytics (simple by chapter) ---------- */
function AnalyticsPage({ questions, onHome }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const h = JSON.parse(localStorage.getItem(LS_HISTORY) || "[]");
    setHistory(h);
  }, []);

  // Simple: show total attempts and avg score per chapter from history
  const byChapter = useMemo(() => {
    const m = new Map();
    history.forEach(h => {
      const key = h.chapter || "Mixed";
      const v = m.get(key) || { attempts: 0, correct: 0, total: 0 };
      v.attempts += 1;
      v.correct += h.score;
      v.total += h.total;
      m.set(key, v);
    });
    return [...m.entries()]
      .map(([ch, v]) => ({ chapter: ch, attempts: v.attempts, accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0 }))
      .sort((a,b)=>b.attempts-a.attempts);
  }, [history]);

  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onHome} className="rounded border px-3 py-1 hover:bg-gray-50">Home</button>
          <h2 className="text-xl font-semibold">Analytics</h2>
        </div>

        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Chapter</th>
                <th className="text-left px-3 py-2">Attempts</th>
                <th className="text-left px-3 py-2">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {byChapter.length === 0 && (
                <tr><td className="px-3 py-3 text-gray-500" colSpan="3">No data yet.</td></tr>
              )}
              {byChapter.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{r.chapter}</td>
                  <td className="px-3 py-2">{r.attempts}</td>
                  <td className="px-3 py-2">{r.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ---------- mount ---------- */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
