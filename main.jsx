const { useState, useEffect } = React;

function App() {
  const [mode, setMode] = useState("practice");
  const [chapter, setChapter] = useState("All");
  const [numQuestions, setNumQuestions] = useState(10);
  const [available, setAvailable] = useState(42);
  const [estimated, setEstimated] = useState("00:00");

  // Auto-update estimated time (1.2 min per question)
  useEffect(() => {
    const totalMinutes = numQuestions * 1.2;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.round((totalMinutes * 60) % 60);
    setEstimated(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
  }, [numQuestions]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-12 bg-gradient-to-br from-pink-50 to-teal-50">
      <h1 className="text-3xl font-semibold text-gray-800 mb-4">
        EconoLearn – CUET PG Economics
      </h1>

      <div className="bg-pink-100/80 backdrop-blur-lg p-6 rounded-2xl shadow-lg w-full max-w-3xl">
        <h2 className="text-2xl font-bold mb-2">
          EconoLearn – MCQ Practice for CUET PG Economics
        </h2>
        <p className="text-gray-700 mb-4">
          Practice chapter-wise Economics PYQs with instant feedback.
        </p>

        {/* Chapter Filter */}
        <label className="block text-sm font-medium mb-2">Chapter Filter</label>
        <div className="relative mb-4 z-50">
          <select
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className="block w-full appearance-none bg-white border border-gray-300 text-gray-800 py-2 px-3 pr-8 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all duration-200"
          >
            <option value="All">All</option>
            <option value="Theory of Consumer Behaviour">Theory of Consumer Behaviour</option>
            <option value="Theory of Demand & Elasticity">Theory of Demand & Elasticity</option>
            <option value="Theory of Production & Cost">Theory of Production & Cost</option>
            <option value="Market Structures">Market Structures</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
            ▼
          </div>
        </div>

        {/* Mode */}
        <div className="flex items-center mb-4 space-x-6">
          <span className="font-medium">Mode</span>
          <label className="flex items-center space-x-1">
            <input type="radio" checked={mode === "practice"} onChange={() => setMode("practice")} />
            <span>Practice</span>
          </label>
          <label className="flex items-center space-x-1">
            <input type="radio" checked={mode === "test"} onChange={() => setMode("test")} />
            <span>Test</span>
          </label>
        </div>

        {/* No. of Questions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">No. of Questions</label>
            <input
              type="number"
              min="1"
              max={available}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
            <p className="text-sm text-gray-600 mt-1">Available: {available}</p>
          </div>
          <div className="mt-2 sm:mt-6 text-sm text-gray-700">
            Estimated Time: <b>{estimated}</b>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          <button className="bg-teal-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-teal-700 transition">
            {mode === "practice" ? "Start Practice" : "Start Test"}
          </button>
          <button className="bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded-md shadow-sm hover:bg-gray-100 transition">
            Review Past Results
          </button>
          <button className="bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded-md shadow-sm hover:bg-gray-100 transition">
            Analytics
          </button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
