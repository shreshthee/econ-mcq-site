const App = () => {
  const [questions, setQuestions] = React.useState([]);
  const [current, setCurrent] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    fetch('questions.json')
      .then(res => res.json())
      .then(data => setQuestions(data))
      .catch(err => console.error("Error loading questions:", err));
  }, []);

  if (!questions.length) {
    return (
      <div className="text-center">
        <p className="text-lg text-gray-500">Loading questions...</p>
      </div>
    );
  }

  const handleSelect = (option) => {
    setAnswers({ ...answers, [current]: option });
  };

  const next = () => {
    if (current < questions.length - 1) setCurrent(current + 1);
  };

  const prev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const submit = () => setSubmitted(true);

  const score = Object.entries(answers).reduce((acc, [i, ans]) => {
    return ans === questions[i].answer ? acc + 1 : acc;
  }, 0);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-2xl font-bold text-center mb-4">Your Result</h2>
        <p className="text-center text-lg mb-4">
          Score: {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
        </p>
        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={i} className="border p-4 rounded-lg shadow-sm">
              <p className="font-semibold">{i + 1}. {q.question}</p>
              <p className={`mt-2 ${answers[i] === q.answer ? 'text-green-600' : 'text-red-600'}`}>
                Your answer: {answers[i] || 'Not answered'}
              </p>
              <p className="text-green-700">Correct: {q.answer}</p>
              <p className="text-gray-600 text-sm mt-1">{q.explanation}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <button
            onClick={() => { setSubmitted(false); setAnswers({}); setCurrent(0); }}
            className="bg-primary text-white px-6 py-2 rounded-lg"
          >
            Retry Test
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-semibold mb-2 text-primary">
        Question {current + 1} of {questions.length}
      </h2>
      <p className="mb-4">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <label key={i} className="block border rounded-lg px-3 py-2 cursor-pointer hover:bg-blue-50">
            <input
              type="radio"
              name={`q${current}`}
              checked={answers[current] === opt}
              onChange={() => handleSelect(opt)}
              className="mr-2"
            />
            {opt}
          </label>
        ))}
      </div>
      <div className="flex justify-between mt-6">
        <button onClick={prev} disabled={current === 0} className="bg-gray-300 px-4 py-2 rounded-lg disabled:opacity-50">Previous</button>
        {current < questions.length - 1 ? (
          <button onClick={next} className="bg-primary text-white px-4 py-2 rounded-lg">Next</button>
        ) : (
          <button onClick={submit} className="bg-green-600 text-white px-4 py-2 rounded-lg">Submit</button>
        )}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

