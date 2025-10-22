const { useEffect, useState, useMemo } = React;

function App() {
  const [page, setPage] = useState("home");        // home | quiz | result
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});       // { index: optionString }

  // Load questions from JSON (with cache-buster)
  useEffect(() => {
    fetch("questions.json?v=" + Date.now())
      .then(r => r.json())
      .then(data => {
        // Accept either an array or {questions:[...]}
        const list = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(list);
      })
      .catch(err => {
        console.error("Failed to load questions.json", err);
        setQuestions([]);
      });
  }, []);

  // --- helpers ---
  const total = questions.length;
  const q = total ? questions[current] : null;

  const handleSelect = (opt) => setAnswers(prev => ({ ...prev, [current]: opt }));
  const next = () => setCurrent(i => Math.min(i + 1, total - 1));
  const prev = () => setCurrent(i => Math.max(i - 1, 0));
  const resetAll = () => { setPage("home"); setCurrent(0); setAnswers({}); };

  const score = useMemo(() => {
    return Object.entries(answers).reduce((acc, [i, val]) => {
      return questions[i] && val === questions[i].answer ? acc + 1 : acc;
    }, 0);
  }, [answers, questions]);

  // --- pages ---
  if (page === "home") {
    return (
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow p-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-center">
            Economics MCQ Practice – CUET | DSE | JNU | UOH
          </h1>
          <p className="text-center text-gray-600 mt-2">
            Practice chapter-wise Economics PYQs with instant feedback.
          </p>

          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Loaded questions: <b>{total || "0"}</b>
              {!total && <span className="ml-2">(<em>check questions.json</em>)</span>}
            </div>
            <button
              onClick={() => { if (total) setPage("quiz"); }}
              className="bg-primary text-white px-5 py-2 rounded-lg disabled:opacity-50"
              disabled={!total}
            >
              Start Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "result") {
    const pct = total ? Math.round((score / total) * 100) : 0;
    return (
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={resetAll} className="border px-4 py-1 rounded hover:bg-gray-100">Home</button>
          <h2 className="font-semibold text-lg">Results</h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="text-3xl font-bold">{score}/{total}</div>
          <div className="text-gray-600">Score: {pct}%</div>
        </div>

        <div className="space-y-4">
          {questions.map((qq, i) => {
            const sel = answers[i];
            const correct = sel === qq.answer;
            return (
              <div key={i} className="border rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Q{i+1}. {qq.question}</p>
                  <span className={`text-xs px-2 py-1 rounded ${correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{qq.chapter} • {qq.source}</p>
                <p className="mt-2 text-sm">Your answer: <b>{sel || 'Not answered'}</b></p>
                <p className="text-sm text-green-700">Correct: <b>{qq.answer}</b></p>
                <p className="text-sm text-gray-700 mt-2">{qq.explanation}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <button onClick={resetAll} className="border px-5 py-2 rounded hover:bg-gray-100">Go Home</button>
        </div>
      </div>
    );
  }

  // quiz page
  if (!q) {
    return <div className="text-gray-500">Loading questions…</div>;
  }

  return (
    <div className="w-full max-w-3xl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={resetAll} className="border px-4 py-1 rounded hover:bg-gray-100">Home</button>
        <div className="text-sm text-gray-600">Question {current + 1} of {total}</div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="font-semibold text-lg">{q.chapter}</h3>
        <p className="text-sm text-gray-500 mb-3">{q.source}</p>

        <div className="bg-gray-50 rounded p-4">
          <p className="mb-4">{q.question}</p>
          <div className="space-y-3">
            {q.options.map((opt, idx) => (
              <label
                key={idx}
                className={`block border rounded px-3 py-2 cursor-pointer ${answers[current] === opt ? 'bg-teal-50 border-teal-500' : 'bg-white'}`}
              >
                {/* UNIQUE name per question prevents “mixing” */}
                <input
                  type="radio"
                  name={`q-${current}`}
                  checked={answers[current] === opt}
                  onChange={() => handleSelect(opt)}
                  className="mr-2"
                />
                <b>{String.fromCharCode(65 + idx)}.</b> {opt}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button onClick={prev} disabled={current === 0} className="px-4 py-2 border rounded disabled:opacity-50">Previous</button>
          {current < total - 1 ? (
            <button onClick={next} className="px-4 py-2 bg-primary text-white rounded">Next</button>
          ) : (
            <button onClick={() => setPage("result")} className="px-4 py-2 bg-green-600 text-white rounded">Submit</button>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
