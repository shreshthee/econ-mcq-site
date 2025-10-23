import React, { useState, useEffect, useRef } from "react";
import questionsData from "./questions.json";

/* ----------------- FancySelect (glassy, animated, cross-browser) ----------------- */
function FancySelect({ options = [], value, onChange, label = "Select" }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, options.findIndex((o) => o === value))
  );
  const btnRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        btnRef.current &&
        listRef.current &&
        !btnRef.current.contains(e.target) &&
        !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown")
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    else if (e.key === "ArrowUp")
      setActiveIndex((i) => Math.max(0, i - 1));
    else if (e.key === "Enter") {
      const choice = options[activeIndex];
      onChange?.(choice);
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full" onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   border border-white/60 bg-white/60 backdrop-blur
                   text-left shadow-sm hover:bg-white/70 transition"
      >
        <span className="truncate">{value ?? label}</span>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div
        ref={listRef}
        role="listbox"
        className={`absolute z-20 mt-2 w-full rounded-2xl border border-white/50
                    bg-white/80 backdrop-blur-xl shadow-xl overflow-hidden
                    transform transition-all duration-200 origin-top
                    ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
      >
        <ul className="max-h-64 overflow-auto p-1">
          {options.map((opt, idx) => {
            const selected = opt === value;
            const active = idx === activeIndex;
            return (
              <li
                key={opt}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange?.(opt);
                  setOpen(false);
                }}
                className={`px-4 py-3 rounded-xl cursor-pointer
                            transition-colors select-none
                            ${
                              selected
                                ? "bg-teal-500/90 text-white"
                                : active
                                ? "bg-gray-200/70"
                                : "hover:bg-gray-100/80"
                            }`}
              >
                <div className="font-medium leading-snug">{opt}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------- Main App ------------------------------- */
export default function App() {
  const [chapter, setChapter] = useState("All");
  const [mode, setMode] = useState("Practice");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    setQuestions(questionsData);
  }, []);

  useEffect(() => {
    const q = chapter === "All"
      ? questions
      : questions.filter((x) => x.chapter === chapter);
    setFiltered(q);
  }, [chapter, questions]);

  useEffect(() => {
    setTimer(Math.ceil(numQuestions * 1.2 * 60));
  }, [numQuestions]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center
                 bg-gradient-to-br from-pink-50 to-pink-100 relative"
      style={{
        backgroundImage: "url('./ganesh.png')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left bottom",
        backgroundSize: "250px",
        backgroundAttachment: "fixed",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="max-w-3xl w-full text-center px-6 py-10 bg-white/40 backdrop-blur-lg shadow-2xl rounded-3xl border border-white/30">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          EconoLearn – MCQ Practice for CUET PG Economics
        </h1>
        <p className="text-gray-700 mb-8">
          Practice chapter-wise Economics PYQs with instant feedback.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-700 mb-2 font-semibold">
              Chapter Filter
            </label>
            <FancySelect
              label="Select Chapter"
              value={chapter}
              onChange={setChapter}
              options={[
                "All",
                ...new Set(questions.map((q) => q.chapter).filter(Boolean)),
              ]}
            />
          </div>

          <div className="flex justify-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "Practice"}
                onChange={() => setMode("Practice")}
              />
              Practice
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "Test"}
                onChange={() => setMode("Test")}
              />
              Test
            </label>
          </div>

          <div className="flex flex-col items-center">
            <label className="block text-gray-700 font-semibold mb-2">
              No. of Questions
            </label>
            <input
              type="number"
              min="1"
              max={filtered.length}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-32 text-center px-2 py-1 border border-pink-200 rounded-lg bg-white/60 backdrop-blur"
            />
            <p className="mt-2 text-gray-600 text-sm">
              Available: {filtered.length}
            </p>
            {mode === "Test" && (
              <p className="mt-1 text-gray-700 font-medium">
                Estimated Time:{" "}
                {`${Math.floor(timer / 60)
                  .toString()
                  .padStart(2, "0")}:${(timer % 60)
                  .toString()
                  .padStart(2, "0")}`}
              </p>
            )}
          </div>

          <div className="flex justify-center gap-6 mt-6">
            <button className="px-6 py-2 bg-teal-600 text-white rounded-lg shadow-md hover:bg-teal-700 transition">
              Start {mode}
            </button>
            <button className="px-6 py-2 bg-white/70 backdrop-blur-md rounded-lg border border-teal-200 hover:bg-white/90 transition">
              Review Past Results
            </button>
            <button className="px-6 py-2 bg-white/70 backdrop-blur-md rounded-lg border border-teal-200 hover:bg-white/90 transition">
              Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
