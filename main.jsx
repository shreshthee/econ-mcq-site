const { useEffect, useMemo, useRef, useState } = React;

/* ---------------- Local Storage Helpers ---------------- */
const LS_KEY = "econ_mcq_history_v2";
const store = {
  get() { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};

/* ---------------- Timer Logic (1.2 min per Q) ---------------- */
const TIME_PER_Q_MIN = 1.2;
const timeForN = (n) => Math.round(n * TIME_PER_Q_MIN * 60);
const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ---------------- Styling Helpers ---------------- */
const glassCard = "relative rounded-3xl p-6 bg-white/30 backdrop-blur-xl border border-white/40 overflow-visible";
const cardWrap  = "relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-200/70 via-red-200/60 to-rose-200/70 shadow-lg shadow-red-200/40";
const glassBtn  = (extra="") => `px-4 py-2 rounded-lg border border-white/40 bg-white/30 hover:bg-white/40
                                  text-gray-800 backdrop-blur-xl transition shadow-sm hover:shadow
                                  transform-gpu hover:scale-[1.03] active:scale-[0.99] ${extra}`;
const solidBtn  = (extra="") => `px-5 py-2 rounded-lg text-white shadow-md transform-gpu hover:scale-[1.03] active:scale-[0.99] ${extra}`;

/* ---------------- Ganesh Background ---------------- */
const Background = () => (
  <>
    <div className="pointer-events-none fixed left-0 top-1/2 -translate-y-1/2
                    w-[45vmin] h-[60vmin] sm:w-[40vmin] sm:h-[55vmin]
                    bg-[url('./ganesh.png')] bg-no-repeat bg-contain bg-left
                    opacity-25 rounded-[999px]" />
    <div className="fixed inset-0 -z-10 bg-rose-50/10" />
  </>
);

/* ---------------- FancySelect (Portal-based) ---------------- */
function FancySelect({ options = [], value, onChange, label = 'Select' }) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(Math.max(0, options.findIndex(o => o === value)));
  const btnRef = React.useRef(null);
  const [pos, setPos] = React.useState({ left: 0, top: 0, width: 0 });

  React.useEffect(() => {
    const close = (e) => {
      if (!btnRef.current) return;
      if (!open) return;
      if (!btnRef.current.contains(e.target)) setOpen(false);
    };
    const reposition = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 6, width: r.width });
    };
    if (open) {
      reposition();
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      document.addEventListener('mousedown', close);
    }
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('mousedown', close);
    };
  }, [open]);

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') setActiveIndex(i => Math.min(options.length - 1, i + 1));
    else if (e.key === 'ArrowUp')   setActiveIndex(i => Math.max(0, i - 1));
    else if (e.key === 'Enter')     { onChange?.(options[activeIndex]); setOpen(false); }
  };

  const panel = open ? ReactDOM.createPortal(
    <div
      role="listbox"
      style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width, zIndex: 1000 }}
      className="rounded-2xl border border-white/50
                 bg-white/90 backdrop-blur-xl shadow-xl overflow-auto max-h-64 p-1
                 animate-[fadeIn_.15s_ease]"
    >
      <ul>
        {options.map((opt, idx) => {
          const selected = opt === value;
          const active   = idx === activeIndex;
          return (
            <li key={opt}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => { onChange?.(opt); setOpen(false); }}
                className={`px-4 py-3 rounded-xl cursor-pointer select-none transition
                            ${selected ? 'bg-teal-500/90 text-white'
                             : active  ? 'bg-gray-200/70'
                                       : 'hover:bg-gray-100/80'}`}>
              <div className="font-medium leading-snug">{opt}</div>
            </li>
          );
        })}
      </ul>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative w-full overflow-visible" onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   border border-white/60 bg-white/60 backdrop-blur
                   text-left shadow-sm hover:bg-white/70 transition"
      >
        <span className="truncate">{value ?? label}</span>
        <svg className={`w-5 h-5 text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}
             viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd" />
        </svg>
      </button>
      {panel}
    </div>
  );
}

/* ---------------- TopBar ---------------- */
const TopBar = ({ onHome, onHistory, onAnalytics }) => (
  <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-base md:text-lg font-semibold">EconoLearn – CUET PG Economics</h1>
      <div className="flex items-center gap-3 text-sm">
        <button onClick={onHistory} className={glassBtn()}>Review Past Results</button>
        <button onClick={onAnalytics} className={glassBtn()}>Analytics</button>
      </div>
    </div>
  </header>
);

/* ---------------- App ---------------- */
const App = () => {
  const [page, setPage] = useState('home');
  const [chapter, setChapter] = useState('All');
  const [mode, setMode] = useState('practice');
  const [questions, setQuestions] = useState([]);
  const [testCount, setTestCount] = useState(10);

  useEffect(() => {
    fetch('questions.json?v=' + Date.now())
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setQuestions(d) : setQuestions(d.questions || []))
      .catch(()=>alert('Error loading questions.'));
  }, []);

  const filteredCount = chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
  const est = timeForN(Math.min(testCount, filteredCount));

  const chapterOptions = ['All', ...new Set(questions.map(q=>q.chapter).filter(Boolean))];

  return (
    <>
      <TopBar onHome={()=>setPage('home')} onHistory={()=>alert('History Page')} onAnalytics={()=>alert('Analytics Page')} />
      <Background/>
      <main className="relative max-w-6xl mx-auto px-4 py-10">
        <section className={cardWrap}>
          <div className={glassCard}>
            <h2 className="text-3xl font-semibold">EconoLearn – MCQ Practice for CUET PG Economics</h2>
            <p className="text-gray-700 mt-2">Practice chapter-wise Economics PYQs with instant feedback.</p>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block">Chapter Filter</label>
                <FancySelect value={chapter} onChange={setChapter} options={chapterOptions} />
              </div>
              <div>
                <label className="text-sm mb-1 block">Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} /> Practice</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')} /> Test</label>
                </div>
              </div>
            </div>

            {mode==='test' && (
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">No. of Questions</label>
                  <input
                    type="number"
                    min="1"
                    max={filteredCount}
                    value={testCount}
                    onChange={e=>setTestCount(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white/60 backdrop-blur"
                  />
                  <p className="text-xs text-gray-700 mt-1">Available: {filteredCount}</p>
                </div>
                <div className="flex items-end">
                  <div className="p-2 border rounded bg-white/60 backdrop-blur text-sm">
                    Estimated Time : {fmt(est)}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3 flex-wrap">
              <button className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Start {mode==='test'?'Test':'Practice'}</button>
              <button className={glassBtn()}>Review Past Results</button>
              <button className={glassBtn()}>Analytics</button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

/* ---------------- Mount ---------------- */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
