const { useEffect, useState } = React;

/** HH:MM:SS from minutes (float) */
function minutesToHMS(mins) {
  const total = Math.round(mins * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function HomeCard() {
  const [chapter, setChapter] = useState('All');
  const [mode, setMode] = useState('practice');
  const [available, setAvailable] = useState(42);
  const [num, setNum] = useState(10);
  const [eta, setEta] = useState('00:00:00');

  // timer = N × 1.2 minutes
  useEffect(() => {
    const totalMinutes = Number(num || 0) * 1.2;
    setEta(minutesToHMS(totalMinutes));
  }, [num]);

  // UI (glass card exactly like before)
  return (
    <section className="relative">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mt-10 sm:mt-14 bg-rose-100/55 backdrop-blur-xl border border-white/70 rounded-3xl shadow-soft">
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl sm:text-[28px] font-semibold text-gray-900">
              EconoLearn – MCQ Practice for CUET PG Economics
            </h2>
            <p className="text-gray-700 mt-2">
              Practice chapter-wise Economics PYQs with instant feedback.
            </p>

            {/* Chapter Filter */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Chapter Filter</label>
              <div className="relative z-50">
                <select
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/70 bg-white/80 backdrop-blur px-3 py-2 pr-10
                             shadow-soft focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                >
                  <option>All</option>
                  <option>Theory of Consumer Behaviour</option>
                  <option>Theory of Demand & Elasticity</option>
                  <option>Theory of Production & Cost</option>
                  <option>Market Structures</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
              </div>
            </div>

            {/* Mode */}
            <div className="mt-6">
              <span className="block text-sm font-semibold text-gray-800 mb-2">Mode</span>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="mode" checked={mode === 'practice'} onChange={() => setMode('practice')} />
                  <span>Practice</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="mode" checked={mode === 'test'} onChange={() => setMode('test')} />
                  <span>Test</span>
                </label>
              </div>
            </div>

            {/* No. of Questions + ETA */}
            <div className="mt-6 grid sm:grid-cols-[1fr_auto] items-end gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">No. of Questions</label>
                <input
                  type="number"
                  min="1"
                  max={available}
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  className="w-full rounded-xl border border-white/70 bg-white/80 backdrop-blur px-3 py-2 shadow-soft
                             focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                />
                <p className="text-sm text-gray-600 mt-1">Available: {available}</p>
              </div>
              <div className="sm:mb-1 text-sm text-gray-700">
                Estimated Time: <span className="font-semibold">{eta}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-teal-600 text-white px-5 py-2 shadow-soft hover:bg-teal-700 transition"
                onClick={() => alert(`${mode === 'practice' ? 'Practice' : 'Test'} starting for ${num} questions`)}
              >
                {mode === 'practice' ? 'Start Practice' : 'Start Test'}
              </button>
              <button
                className="rounded-xl border border-white/70 bg-white/80 backdrop-blur px-5 py-2 shadow-soft hover:bg-white transition"
                onClick={() => alert('Review Past Results (to be wired)')}
              >
                Review Past Results
              </button>
              <button
                className="rounded-xl border border-white/70 bg-white/80 backdrop-blur px-5 py-2 shadow-soft hover:bg-white transition"
                onClick={() => alert('Analytics (to be wired)')}
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

function App() {
  return (
    <div className="py-6 sm:py-8">
      <HomeCard />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
