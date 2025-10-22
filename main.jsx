<button className="bg-primary text-white px-3 py-1 rounded" onClick={()=>{setReviewMode(r=>!r)}}>{reviewMode? 'Hide Review' : 'Review Mode'}</button>
</div>
</div>


<div className="bg-white p-6 rounded shadow-md">
<div className="flex items-center justify-between">
<div>
<div className="text-3xl font-bold">{correct}/{total}</div>
<div className="text-sm text-muted">Score: {percent}%</div>
</div>
<div>
<button className="border px-3 py-1 rounded" onClick={()=>{
// export simple CSV of results
const rows = ['Q No,Chapter,Question,Selected,Correct,Result,Explanation'];
filteredQuestions.forEach((q,i)=>{
const sel = selectedAnswers[i] != null ? q.options[selectedAnswers[i]] : '';
const corr = q.answer;
const res = sel === corr ? 'Correct' : 'Incorrect';
rows.push(`${i+1},"${q.chapter}","${q.question.replace(/"/g,'""')}","${sel}","${corr}",${res},"${q.explanation.replace(/"/g,'""')}"\`);
});
const blob = new Blob([rows.join('\n')], {type:'text/csv'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = 'mcq-results.csv'; a.click();
URL.revokeObjectURL(url);
}}>Export CSV</button>
</div>
</div>


<hr className="my-4" />


<div className="space-y-4">
{filteredQuestions.map((q, i)=>{
const selIdx = selectedAnswers[i];
const selectedText = selIdx == null ? 'Not answered' : q.options[selIdx];
const isCorrect = selectedText === q.answer;
return (
<div key={i} className="p-4 rounded border">
<div className="flex justify-between">
<div><strong>Q{i+1}.</strong> <span className="ml-2">{q.question}</span></div>
<div className={`px-2 py-1 rounded text-sm ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{isCorrect ? 'Correct' : 'Incorrect'}</div>
</div>
<div className="mt-2 text-sm text-muted">Your answer: <strong>{selectedText}</strong> | Correct: <strong>{q.answer}</strong></div>
{reviewMode && (
<div className="mt-2 p-3 bg-gray-50 rounded text-sm">
<div className="font-medium">Explanation</div>
<div className="mt-1">{q.explanation}</div>
</div>
)}
</div>
);
})}
</div>
</div>
</div>
);
}


return <div>Unknown page</div>;
}


ReactDOM.createRoot(document.getElementById('root')).render(<App />);




/* =========================================================
Notes for production use / editing
- Replace the in-file `questions` array with an import from JSON when bundling.
- Remove Babel and use a proper bundler (Vite / webpack) for better performance.
- Tailwind CDN is used here for simplicity; for production, compile Tailwind.
- LocalStorage key is 'econ_mcq_attempts_v1' — change if schema changes.
- Explanations are shown only in Review Mode (toggle on the Result page).
- To add question categories, include different `chapter` values and use the Category select on Home.
========================================================= */
