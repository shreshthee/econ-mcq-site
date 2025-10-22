const App = () => {
  const [questions, setQuestions] = React.useState([]);
  const [current, setCurrent] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    fetch('questions.json?v=' + Date.now())
      .then(res => res.json())
      .then(data => setQuestions(data))
      .catch(err => console.error("Error loading questions:", err));
  }, []);

  if (!questions.length) {
    return (
      <div className="text-center text-gray-500 mt-10">
        Loading questions...
      </div>
    );
  }

  const total = questions.length;
  const q = questions[current];

  const handleSelect = (opt) => setAnswers({ ...answers, [current]: opt });
  const next = () => setCurrent(c => Math.min(c + 1, total - 1));
  const prev = () => setCurrent(c => Math.max(c - 1, 0));
  const submit = () => setSubmitted(true);

  const score = Object.entries(answers).reduce(
    (acc, [i, ans]) => (ans === questions[i].answer ? acc + 1 : acc),
    0
  );

  // === Result Page ===
  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => { setSubmitted(false); setAnswers({}); setCurrent(0); }}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Home
          </button>
          <h2 className="font-semibold text-lg">Result Summary</h2>
        </div>

        <div className="text-center mb-6">
          <div className="text-3xl font-bold">{score}/{total}</div>
          <p className="text-gray-600">Score: {Math.round((score/total)*100)}%</p>
        </div>

        <div className="space-y-6">
          {questions.map((q, i) => {
            const ans = answers[i];
            const correct = ans === q.answer;
            return (
              <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
                <p className="font-semibold mb-2">{i + 1}. {q.question}</p>
                <p className={`text-sm ${correct ? 'text-green-600' : 'text-red-600'}`}>
                  Your answer: {ans || 'Not answered'}
                </p>
                <p className="text-green-700 text-sm">Correct: {q.answer}</p>
                <p className="text-gray-600 text-sm mt-2">{q.explanation}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // === Quiz Page ===
  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => window.location.reload()}
          className="border px-4 py-1 rounded-lg text-gray-700 hover:bg-gray-100"
        >
          Home
        </button>
        <div className="text-sm text-gray-600">
          Question {current + 1} of {total}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h3 className="font-semibold text-lg">{q.chapter}</h3>
        <p className="text-sm text-gray-500 mb-3">{q.source}</p>

        <p className="mb-4 text-gray-800">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <label
              key={i}
              className={`block border rounded-lg px-3 py-2 cursor-pointer ${
                answers[current] === opt ? 'bg-teal-50 border-teal-500' : ''
              }`}
            >
              <input
                type="radio"
                name={`q${current}`}
                checked={answers[current] === opt}
                onChange={() => handleSelect(opt)}
                className="mr-2"
              />
              {String.fromCharCode(65 + i)}. {opt}
            </label>
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={prev}
            disabled={current === 0}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          {current < total - 1 ? (
            <button
              onClick={next}
              className="px-4 py-2 bg-primary text-white rounded-lg"
            >
              Next
            </button>
          ) : (
            <button
              onClick={submit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg"
            >
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
