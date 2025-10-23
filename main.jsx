/* main.jsx — updated to fix Review Past Results blank page issue */
const { useState, useEffect, useMemo, useRef } = React;

// Local Storage helpers
const LS_KEY = "econ_mcq_history_v2";
const ls = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) ?? [];
    } catch {
      return [];
    }
  },
  set(v) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(v));
    } catch {}
  },
};

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sampleN = (arr, n) => shuffle(arr).slice(0, n);
const fmtTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
    2,
    "0"
  )}`;
const timeForQuestionsSec = (n) => Math.ceil(n * 1.2 * 60);

const App = () => {
  const [page, setPage] = useState("home");
  const [mode, setMode] = useState("practice");
  const [questions, setQuestions] = useState([]);
  const [activeSet, setActiveSet] = useState([]);
  const [chapter, setChapter] = useState("All");
  const [testCount, setTestCount] = useState(10);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [skipped, setSkipped] = useState({});
  const [remainingSec, setRemainingSec] = useState(0);
  const [sortBy, setSortBy] = useState("date_desc"); // <-- moved here globally

  const timerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load questions.json
  useEffect(() => {
    fetch("questions.json?v=" + Date.now())
      .then((r) => r.json())
      .then(setQuestions)
      .catch(() => setError("Failed to load questions"))
      .finally(() => setLoading(false));
  }, []);

  const total = activeSet.length;
  const attempted = Object.keys(answers).length;
  const unattempted = Math.max(0, total - attempted);
  const score = activeSet.reduce(
    (s, q, i) => s + (answers[i] === q.answer ? 1 : 0),
    0
  );

  // timer handling
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const startTimer = (sec) => {
    stopTimer();
    setRemainingSec(sec);
    timerRef.current = setInterval(() => {
      setRemainingSec((p) => {
        if (p <= 1) {
          clearInterval(timerRef.current);
          setPage("result");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  // Save results
  useEffect(() => {
    if (page !== "result" || !activeSet.length) return;
    const percent = total ? Math.round((score / total) * 100) : 0;
    const data = {
      id: "attempt_" + Date.now(),
      timestamp: new Date().toISOString(),
      mode,
      chapter,
      total,
      score,
      percent,
      durationSec: mode === "test" ? timeForQuestionsSec(total) : null,
      answers: Array.from({ length: total }, (_, i) => answers[i] ?? null),
      questions: activeSet.map((q) => ({
        chapter: q.chapter,
        question: q.question,
        options: q.options,
        answer: q.answer,
        source: q.source ?? "",
      })),
    };
    const h = ls.get();
    h.unshift(data);
    ls.set(h.slice(0, 50));
  }, [page]);

  /* ---------- RENDERING ---------- */

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  /* --- HOME PAGE --- */
  if (page === "home") {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">
          EconoLearn – MCQ Practice for CUET PG Economics
        </h2>
        <p className="mb-4 text-gray-600">
          Practice chapter-wise Economics PYQs with instant feedback.
        </p>

        <div className="space-y-4">
          <div>
            <label>Chapter:</label>
            <select
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="border p-1 ml-2"
            >
              <option>All</option>
              {[...new Set(questions.map((q) => q.chapter))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Mode:</label>
            <label className="ml-2">
              <input
                type="radio"
                checked={mode === "practice"}
                onChange={() => setMode("practice")}
              />
              Practice
            </label>
            <label className="ml-4">
              <input
                type="radio"
                checked={mode === "test"}
                onChange={() => setMode("test")}
              />
              Test
            </label>
          </div>

          {mode === "test" && (
            <div>
              <label>Number of questions: </label>
              <input
                type="number"
                min="1"
                value={testCount}
                onChange={(e) => setTestCount(e.target.value)}
                className="border w-20 ml-2"
              />
            </div>
          )}

          <button
            onClick={() => {
              const qset =
                chapter === "All"
                  ? questions
                  : questions.filter((q) => q.chapter === chapter);
              const n = mode === "test" ? +testCount || 1 : qset.length;
              const set = mode === "test" ? sampleN(qset, n) : qset;
              setActiveSet(set);
              setAnswers({});
              setMarked({});
              setSkipped({});
              setCurrent(0);
              if (mode === "test") startTimer(timeForQuestionsSec(n));
              setPage("quiz");
            }}
            className="bg-teal-600 text-white px-4 py-2 rounded"
          >
            Start {mode === "test" ? "Test" : "Practice"}
          </button>

          <button
            onClick={() => setPage("history")}
            className="ml-3 border px-4 py-2 rounded"
          >
            Review Past Results
          </button>
        </div>
      </main>
    );
  }

  /* --- HISTORY PAGE --- */
  if (page === "history") {
    const h = ls.get();
    const sorted = [...h].sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.timestamp) - new Date(a.timestamp);
      if (sortBy === "date_asc") return new Date(a.timestamp) - new Date(b.timestamp);
      if (sortBy === "score_desc") return (b.percent || 0) - (a.percent || 0);
      if (sortBy === "score_asc") return (a.percent || 0) - (b.percent || 0);
      return 0;
    });

    return (
      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-xl font-bold mb-4">Past Results</h2>
        <div className="mb-4">
          <select
            className="border px-2 py-1"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="score_desc">High → Low</option>
            <option value="score_asc">Low → High</option>
          </select>
          <button
            onClick={() => setPage("home")}
            className="ml-4 border px-3 py-1 rounded"
          >
            Home
          </button>
        </div>

        {sorted.length === 0 ? (
          <p>No attempts yet.</p>
        ) : (
          sorted.map((a) => (
            <details key={a.id} className="border rounded mb-3 p-3">
              <summary>
                {new Date(a.timestamp).toLocaleString()} • {a.mode} •{" "}
                {a.chapter} • Score: {a.score}/{a.total} ({a.percent}%)
              </summary>
              {a.questions.map((q, i) => {
                const your = a.answers[i];
                const ok = your === q.answer;
                return (
                  <div key={i} className="border rounded mt-2 p-2 bg-white/70">
                    <div>
                      <b>
                        Q{i + 1}. {q.question}
                      </b>
                    </div>
                    <div className="text-sm">
                      Your: {your || "Not answered"} • Correct:{" "}
                      <b className="text-green-700">{q.answer}</b>{" "}
                      <span
                        className={`text-xs ml-2 ${
                          ok ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {ok ? "✔" : "✖"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </details>
          ))
        )}
      </main>
    );
  }

  /* --- RESULT PAGE --- */
  if (page === "result") {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-xl font-bold mb-2">Result</h2>
        <p>
          Score: {score}/{total} ({Math.round((score / total) * 100)}%)
        </p>
        <button
          onClick={() => {
            stopTimer();
            setPage("home");
          }}
          className="mt-3 border px-4 py-2 rounded"
        >
          Home
        </button>
      </main>
    );
  }

  /* --- QUIZ PAGE (simplified) --- */
  if (page === "quiz") {
    const q = activeSet[current];
    if (!q) return <div>No questions</div>;
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h3 className="font-semibold mb-3">
          {current + 1}/{total}. {q.question}
        </h3>
        <div className="space-y-2 mb-4">
          {q.options.map((o, i) => (
            <label key={i} className="block">
              <input
                type="radio"
                checked={answers[current] === o}
                onChange={() => setAnswers((p) => ({ ...p, [current]: o }))}
              />{" "}
              {o}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="border px-3 py-1 rounded"
          >
            Previous
          </button>
          <button
            onClick={() => setAnswers((p) => {
              const c = { ...p };
              delete c[current];
              return c;
            })}
            className="border px-3 py-1 rounded"
          >
            Clear Response
          </button>
          <button
            onClick={() => setMarked((p) => ({ ...p, [current]: !p[current] }))}
            className="border px-3 py-1 rounded"
          >
            {marked[current] ? "Unmark" : "Mark for Review"}
          </button>
          {current < total - 1 ? (
            <button
              onClick={() => setCurrent((c) => c + 1)}
              className="bg-teal-600 text-white px-3 py-1 rounded"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => setPage("result")}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Submit
            </button>
          )}
        </div>
      </main>
    );
  }

  return null;
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
