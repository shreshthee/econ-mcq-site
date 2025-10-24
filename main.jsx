const { useState, useEffect, useRef } = React;

const CACHE_KEY = "econolearn_results_v2";

const saveResults = (r) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(r));
};
const loadResults = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
  } catch {
    return [];
  }
};

/* --- Ganesh Background --- */
const Background = () => (
  <>
    {/* Desktop Ganesh left side */}
    <div className="hidden md:block fixed left-0 top-1/2 -translate-y-1/2 w-[45vmin] h-[60vmin] bg-[url('./ganesh.png')] bg-no-repeat bg-contain opacity-20" />
    <div className="fixed inset-0 -z-10 bg-rose-50/10" />
  </>
);

function App() {
  const [page, setPage] = useState("home");
  const [mode, setMode] = useState("practice");
  const [chapter, setChapter] = useState("All");
  const [questions, setQuestions] = useState([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState("12:00");
  const [results, setResults] = useState(loadResults());

  useEffect(() => {
    fetch("questions.json?v=" + Date.now())
      .then((r) => r.json())
      .then(setQuestions);
  }, []);

  useEffect(() => saveResults(results), [results]);

  const startTest = () => {
    setPage("quiz");
  };

  const goHome = () => setPage("home");
  const goResults = () => setPage("results");
  const goAnalytics = () => setPage("analytics");

  /* ---------- PAGES ---------- */
  if (page === "home") {
    const chapters = ["All", ...new Set(questions.map((q) => q.chapter))];
    const filteredCount =
      chapter === "All"
        ? questions.length
        : questions.filter((q) => q.chapter === chapter).length;
    const estTime = (numQuestions * 1.2).toFixed(0);
    const timeStr = `${Math.floor(estTime)}:${String(
      Math.round((estTime % 1) * 60)
    ).padStart(2, "0")}`;

    return (
      <>
        <header className="sticky top-0 bg-white/90 backdrop-blur border-b z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="font-extrabold text-gray-900">
              EconoLearn
              <span className="font-medium text-gray-500">
                {" "}
                — CUET PG Economics
              </span>
            </h1>
            <div className="flex gap-2 text-sm">
              <button
                onClick={goResults}
                className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50"
              >
                Review Past Results
              </button>
              <button
                onClick={goAnalytics}
                className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50"
              >
                Analytics
              </button>
            </div>
          </div>
        </header>

        <Background />

        {/* Hero with mobile Ganesh */}
        <div className="text-center mt-4 mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-rose-400">
            EconoLearn
          </h1>
          <div className="md:hidden mt-3 flex justify-center">
            <img
              src="./ganesh.png"
              alt="Ganesh"
              className="w-28 opacity-30 rounded-full select-none"
            />
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 pb-10">
          <div className="rounded-3xl p-6 bg-white/70 backdrop-blur border shadow-lg">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              MCQ Practice for CUET PG Economics
            </h2>
            <p className="text-gray-700 mt-2">
              Practice chapter-wise Economics PYQs with instant feedback.
            </p>

            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-1">Chapter Filter</label>
                <select
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white focus:outline-none"
                >
                  {chapters.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Mode</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={mode === "practice"}
                      onChange={() => setMode("practice")}
                    />
                    Practice
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={mode === "test"}
                      onChange={() => setMode("test")}
                    />
                    Test
                  </label>
                </div>
              </div>
            </div>

            {mode === "test" && (
              <div className="mt-5 grid md:grid-cols-[1fr,auto] gap-6 items-end">
                <div>
                  <label className="block text-sm mb-1">No. of Questions</label>
                  <input
                    type="number"
                    min="1"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(e.target.value)}
                    className="w-24 p-2 border rounded-lg bg-white"
                  />
                  <p className="text-xs text-gray-700 mt-1">
                    Available: {filteredCount}
                  </p>
                </div>

                <div className="text-right">
                  <label className="block text-sm mb-1">Time limit</label>
                  <div className="p-2 border rounded bg-white text-sm w-24 text-center">
                    {timeStr}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={startTest}
                className="px-5 py-2 rounded-lg text-white bg-brand hover:brightness-95"
              >
                Start Test
              </button>
              <button
                onClick={goResults}
                className="px-5 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                Review Past Results
              </button>
              <button
                onClick={goAnalytics}
                className="px-5 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                Analytics
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (page === "analytics") {
    return (
      <>
        <header className="sticky top-0 bg-white/90 backdrop-blur border-b z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="font-extrabold text-gray-900">
              EconoLearn
              <span className="font-medium text-gray-500">
                {" "}
                — CUET PG Economics
              </span>
            </h1>
            <button
              onClick={goHome}
              className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50"
            >
              Home
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-10">
          <h2 className="text-xl font-semibold mb-4">Chapter-wise Analytics</h2>
          <p className="text-gray-500">Analytics feature coming soon…</p>
        </main>
      </>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">
      Coming soon…
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);