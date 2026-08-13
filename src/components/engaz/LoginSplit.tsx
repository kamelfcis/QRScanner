const ENGAZ_LOGO = '/brand/engaz-logo.png';
const ILC_LOGO = '/brand/ilc-soft-logo.png';
const QR_N = 21;

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

function QrMotif() {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#08101c] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div
          className="grid aspect-square w-full gap-[2px] rounded-xl bg-[#0B1220] p-2"
          style={{ gridTemplateColumns: `repeat(${QR_N}, minmax(0, 1fr))` }}
          aria-hidden
        >
          {QR_CELLS.map((filled, i) => (
            <span
              key={i}
              className={filled ? 'rounded-[1px] bg-[#e8ffd6]' : 'rounded-[1px] bg-transparent'}
            />
          ))}
        </div>
        <div className="login-qr-scan pointer-events-none absolute inset-x-4 top-4 h-0.5 rounded-full bg-[#51FE00] shadow-[0_0_18px_#51FE00]" />
      </div>
      <p className="mt-3 text-center text-xs tracking-wide text-white/45">QR → live menu</p>
    </div>
  );
}

export function LoginSplit({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="flex min-h-screen flex-col lg:flex-row">
      <aside className="relative overflow-hidden bg-[#0B1220] px-5 py-5 text-white lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div
          aria-hidden
          className="bg-[#51FE00]/12 pointer-events-none absolute -top-24 right-[-80px] size-[360px] rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(81,254,0,0.55) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative z-10 flex items-center gap-4 lg:flex-col lg:items-start lg:gap-8">
          <img
            src={ENGAZ_LOGO}
            alt="Engaz — QR Menu for Restaurants & Cafés"
            className="h-10 w-auto max-w-[150px] object-contain sm:h-12 lg:h-auto lg:max-w-[280px]"
          />
          <div>
            <p className="font-heading text-lg font-semibold tracking-tight lg:text-3xl">
              Engaz Admin
            </p>
            <p className="mt-0.5 text-xs text-white/55 lg:mt-2 lg:text-sm">
              Super-admin control plane
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-8 hidden lg:block">
          <QrMotif />
        </div>

        <div className="relative z-10 mt-4 flex items-center gap-2.5 lg:mt-0">
          <img
            src={ILC_LOGO}
            alt="ILC Soft"
            className="size-9 rounded-full bg-white object-contain p-0.5"
          />
          <span className="text-sm text-white/70">by ILC Soft</span>
        </div>
      </aside>

      <section className="flex flex-1 items-center justify-center bg-[#F7F8FA] px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </section>
    </div>
  );
}
