/** @jsx React.createElement */
const { useState, useEffect, useMemo } = React;

/* ---------------------------------------------------
   EconoLearn UI helpers
--------------------------------------------------- */
const CARD_GRADIENT = {
  background:
    "linear-gradient(135deg, rgba(254,205,211,0.78) 0%, rgba(252,231,243,0.72) 45%, rgba(254,205,211,0.78) 100%)",
};
const glassCard =
  "relative overflow-hidden rounded-[27px] p-6 bg-white/60 backdrop-blur-xl border border-white/50";
const cardWrap =
  "relative rounded-[28px] p-[1px] shadow-[0_10px_40px_rgba(244,63,94,0.18)]";

const glassBtn = (extra = "") =>
  `rounded-xl px-4 py-2 font-medium bg-white/60 backdrop-blur-md hover:bg-white/70 transition ${extra}`;
const solidBtn = (extra = "") =>
  `rounded-xl px-4 py-2 font-semibold text-white shadow-md ${extra}`;

/* ---------------------------------------------------
   Navbar + Title
--------------------------------------------------- */
function TopBar({ onHome, onHistory, onAnalytics, page }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white/70 backdrop-blur sticky top-0 z-40">
      <h1 className="text-lg font-bold text-gray-800">
        EconoLearn <span className="font-medium text-gray-500">— CUET PG Economics</span>
      </h1>
      <div className="flex gap-3">
        <button type="button" onClick={onHistory} className={glassBtn()}>
          Review Past Results
        </button>
        <button type="button" onClick={onAnalytics} className={glassBtn()}>
          Analytics
        </button>
        {page !== "home" && (
          <button type="button" onClick={onHome} className={glassBtn()}>
            Home
          </button>
        )}
      </div>
    </header>
  );
}

/* ---------------------------------------------------
   Home Section
--------------------------------------------------- */
function Home({ setPage }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Ganesh Image */}
      <img
        src="./ganesh.png"
        alt="Ganesh"
        className="absolute left-8 top-32 opacity-20 w-40 sm:w-56 md:w-64 object-contain"
      />

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-pink-400 mb-6 mt-12 text-center">
        EconoLearn
      </h1>

      {/* Pink Card */}
      <section className={cardWrap} style={CARD_GRADIENT}>
        <div className={glassCard + " w-[90vw] max-w-4xl"}>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            MCQ Practice for CUET PG Economics
          </h2>
          <p className="text-gray-600 mb-6">
            Practice chapter-wise Economics PYQs with instant feedback.
          </p>

          {/* Inputs Row */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex-1 min-w-[220px]">
              <label className="block font-semibold mb-1">Chapter Filter</label>
              <select className="w-full border rounded-lg px-3 py-2 shadow-sm">
                <option>All</option>
                <option>Theory of Consumer Behaviour</option>
                <option>Demand & Elasticity</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Mode</label>
              <div className="flex gap-3">
                <label>
                  <input type="radio" name="mode" defaultChecked /> Practice
                </label>
                <label>
                  <input type="radio" name="mode" /> Test
                </label>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="font-semibold mb-1">No. of Questions</label>
              <input
                type="number"
                defaultValue={10}
                className="w-20 border rounded-lg px-2 py-1 shadow-sm"
              />
              <p className="text-sm text-gray-500 mt-1">Available: 24</p>
            </div>

            <div className="flex flex-col">
              <label className="font-semibold mb-1 text-right">Time limit</label>
              <input
                type="text"
                value="12:00"
                readOnly
                className="w-24 border rounded-lg px-2 py-1 text-center shadow-sm"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap justify-start gap-4 mt-6">
            <button
              type="button"
              className={solidBtn("bg-teal-600 hover:bg-teal-700")}
              onClick={() => alert("Start Practice clicked")}
            >
              Start Practice
            </button>
            <button
              type="button"
              onClick={() => setPage("history")}
              className={glassBtn()}
            >
              Review Past Results
            </button>
            <button
              type="button"
              onClick={() => setPage("analytics")}
              className={glassBtn()}
            >
              Analytics
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------------------------------------------------
   Analytics Page
--------------------------------------------------- */
function Analytics({ setPage }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <section className={cardWrap} style={CARD_GRADIENT}>
        <div className={glassCard + " w-[90vw] max-w-2xl text-center"}>
          <h2 className="text-2xl font-bold mb-4">Chapter-wise Analytics</h2>
          <p className="text-gray-500 mb-6">Coming soon...</p>
          <button
            type="button"
            onClick={() => setPage("home")}
            className={glassBtn()}
          >
            Home
          </button>
        </div>
      </section>
    </main>
  );
}

/* ---------------------------------------------------
   History Page
--------------------------------------------------- */
function History({ setPage }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <section className={cardWrap} style={CARD_GRADIENT}>
        <div className={glassCard + " w-[90vw] max-w-2xl text-center"}>
          <h2 className="text-2xl font-bold mb-4">Past Results</h2>
          <p className="text-gray-500 mb-6">Coming soon...</p>
          <button
            type="button"
            onClick={() => setPage("home")}
            className={glassBtn()}
          >
            Home
          </button>
        </div>
      </section>
    </main>
  );
}

/* ---------------------------------------------------
   App Root
--------------------------------------------------- */
function App() {
  const [page, setPage] = useState("home");

  return (
    <div className="font-sans text-gray-800">
      <TopBar
        onHome={() => setPage("home")}
        onHistory={() => setPage("history")}
        onAnalytics={() => setPage("analytics")}
        page={page}
      />

      {page === "home" && <Home setPage={setPage} />}
      {page === "analytics" && <Analytics setPage={setPage} />}
      {page === "history" && <History setPage={setPage} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);