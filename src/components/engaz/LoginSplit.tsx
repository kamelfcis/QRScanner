const ENGAZ_LOGO = '/brand/engaz-logo.png';
const ILC_LOGO = '/brand/ilc-soft-logo.png';
const QR_N = 21;

type LoginBrandCopy = {
  brandTitle: string;
  brandKicker: string;
  brandBody: string;
  qrCaption: string;
  byline: string;
  eyebrow: string;
};

function qrFilled(x: number, y: number): boolean {
  const finder = (ox: number, oy: number): boolean | null => {
    const dx = x - ox;
    const dy = y - oy;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
    if (dx === 0 || dy === 0 || dx === 6 || dy === 6) return true;
    if (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) return true;
    return false;
  };
  const inFinder = finder(0, 0) ?? finder(QR_N - 7, 0) ?? finder(0, QR_N - 7);
  if (inFinder !== null) return inFinder;
  if (y === 6 || x === 6) return (x + y) % 2 === 0;
  return (x * 3 + y * 5 + x * y) % 7 === 0;
}

const QR_CELLS = Array.from({ length: QR_N * QR_N }, (_, i) =>
  qrFilled(i % QR_N, Math.floor(i / QR_N))
);

/** The scanned-artifact widget: a live QR plate with a beam running down it. */
function QrArtifact({ caption, rtl }: { caption: string; rtl: boolean }) {
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="flex w-full max-w-[300px] items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3"
    >
      <div className="relative size-[104px] shrink-0 overflow-hidden rounded-xl bg-[#070C16] p-1.5 ring-1 ring-inset ring-white/[0.06]">
        <div
          className="grid aspect-square w-full gap-px"
          style={{ gridTemplateColumns: `repeat(${QR_N}, minmax(0, 1fr))` }}
          aria-hidden
        >
          {QR_CELLS.map((filled, i) => (
            <span key={i} className={filled ? 'bg-[#51FE00]/70' : 'bg-transparent'} />
          ))}
        </div>
        <div className="login-qr-scan pointer-events-none absolute inset-x-1.5 h-px rounded-full bg-[#51FE00] shadow-[0_0_10px_#51FE00]" />
      </div>
      <div className={`min-w-0 ${rtl ? 'login-ar' : ''}`}>
        <p className="text-[13px] leading-snug font-medium text-white/70">{caption}</p>
        <p className="login-mono mt-1.5 text-[10px] tracking-[0.16em] text-[#51FE00]/70 uppercase">
          Engaz QR
        </p>
      </div>
    </div>
  );
}

/** Lime viewfinder brackets, lifted from the QR frame inside the Engaz mark. */
function Viewfinder() {
  return (
    <div
      aria-hidden
      className="login-lock pointer-events-none absolute -inset-4 sm:-inset-6 lg:-inset-7"
    >
      <span className="absolute top-0 left-0 size-8 rounded-tl-2xl border-t-2 border-l-2 border-[#51FE00]/60 sm:size-10" />
      <span className="absolute top-0 right-0 size-8 rounded-tr-2xl border-t-2 border-r-2 border-[#51FE00]/60 sm:size-10" />
      <span className="absolute bottom-0 left-0 size-8 rounded-bl-2xl border-b-2 border-l-2 border-[#51FE00]/60 sm:size-10" />
      <span className="absolute right-0 bottom-0 size-8 rounded-br-2xl border-r-2 border-b-2 border-[#51FE00]/60 sm:size-10" />
    </div>
  );
}

export function LoginSplit({
  children,
  copy,
  locale,
}: {
  children: React.ReactNode;
  copy: LoginBrandCopy;
  locale: 'ar' | 'en';
}) {
  const rtl = locale === 'ar';

  return (
    <div
      dir="ltr"
      className="relative flex h-full max-h-full min-h-0 flex-col overflow-hidden lg:flex-row"
    >
      <aside className="relative hidden min-h-0 shrink-0 flex-col overflow-hidden text-white lg:flex lg:w-[52%] lg:px-10 lg:py-8 xl:px-14">
        <div
          dir={rtl ? 'rtl' : 'ltr'}
          className={`relative z-10 shrink-0 ${rtl ? 'login-ar' : ''}`}
        >
          <p
            className={`flex items-center gap-2 text-[10px] text-[#51FE00]/75 ${
              rtl ? 'text-[11px]' : 'login-mono tracking-[0.22em] uppercase'
            }`}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-[#51FE00] shadow-[0_0_8px_#51FE00]" />
            {copy.eyebrow}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#070C16] ring-1 ring-white/10">
              <img src={ENGAZ_LOGO} alt="Engaz" className="size-8 object-contain" />
            </span>
            <span className="h-8 w-px bg-white/10" />
            <span className="login-mono text-[11px] tracking-[0.18em] text-white/40 uppercase">
              Admin
            </span>
          </div>
          <h1 className="font-heading mt-5 text-[30px] leading-tight font-semibold tracking-tight xl:text-[34px]">
            {copy.brandTitle}
          </h1>
          <p className="mt-2 text-sm text-[#51FE00]/80">{copy.brandKicker}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">{copy.brandBody}</p>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 items-center py-6">
          <QrArtifact caption={copy.qrCaption} rtl={rtl} />
        </div>

        <div
          dir={rtl ? 'rtl' : 'ltr'}
          className={`relative z-10 flex shrink-0 items-center gap-2 ${rtl ? 'login-ar' : ''}`}
        >
          <img
            src={ILC_LOGO}
            alt="ILC Soft"
            className="size-7 rounded-full bg-white object-contain p-0.5"
          />
          <span className="text-xs text-white/45">{copy.byline}</span>
        </div>
      </aside>

      <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-7 overflow-y-auto px-6 py-8 sm:px-8 lg:gap-0 lg:overflow-hidden lg:px-10">
        <div className="login-fade-up relative w-full max-w-[380px]">
          <Viewfinder />
          <div className="relative">{children}</div>
        </div>

        <div
          dir={rtl ? 'rtl' : 'ltr'}
          className={`flex shrink-0 items-center gap-2 lg:hidden ${rtl ? 'login-ar' : ''}`}
        >
          <img
            src={ILC_LOGO}
            alt="ILC Soft"
            className="size-5 rounded-full bg-white object-contain p-px"
          />
          <span className="text-[11px] text-white/45">{copy.byline}</span>
        </div>
      </section>
    </div>
  );
}
