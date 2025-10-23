// --- FancySelect (Portal version, with proper inside-click handling) ---
function FancySelect({ options = [], value, onChange, label = 'Select' }) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(Math.max(0, options.findIndex(o => o === value)));
  const btnRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const [pos, setPos] = React.useState({ left: 0, top: 0, width: 0 });

  // keep activeIndex in sync if value changes externally
  React.useEffect(() => {
    const idx = options.findIndex(o => o === value);
    if (idx >= 0) setActiveIndex(idx);
  }, [value, options]);

  React.useEffect(() => {
    const closeOnOutside = (e) => {
      if (!open) return;
      const btn = btnRef.current;
      const panel = panelRef.current;
      const target = e.target;

      // If click is on the button or inside the panel, do NOT close.
      if ((btn && btn.contains(target)) || (panel && panel.contains(target))) return;

      setOpen(false);
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
      document.addEventListener('mousedown', closeOnOutside, true); // capture so it runs before React
    }
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('mousedown', closeOnOutside, true);
    };
  }, [open]);

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') setActiveIndex(i => Math.min(options.length - 1, i + 1));
    else if (e.key === 'ArrowUp')   setActiveIndex(i => Math.max(0, i - 1));
    else if (e.key === 'Enter')     { onChange?.(options[activeIndex]); setOpen(false); }
  };

  // render dropdown in a portal; keep a ref to panel for inside-click checks
  const panel = open ? ReactDOM.createPortal(
    <div
      ref={panelRef}
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
                onMouseDown={(e) => e.preventDefault()} // prevent focus loss flicker
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