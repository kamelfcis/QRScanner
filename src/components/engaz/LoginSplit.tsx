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
    <div className="mx-auto w-full max-w-[120px] opacity-80">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#08101c]/80 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
        <div
          className="grid aspect-square w-full gap-px rounded-lg bg-[#0B1220] p-1.5"
          style={{ gridTemplateColumns: `repeat(${QR_N}, minmax(0, 1fr))` }}
          aria-hidden
        >
          {QR_CELLS.map((filled, i) => (
            <span
              key={i}
              className={filled ? 'rounded-[0.5px] bg-[#51FE00]/70' : 'rounded-[0.5px] bg-transparent'}
            />
          ))}
        </div>
        <div className="login-qr-scan pointer-events-none absolute inset-x-2 top-2 h-px rounded-full bg-[#51FE00] shadow-[0_0_10px_#51FE00]" />
      </div>
      <p className="mt-2 text-center text-[10px] tracking-wider text-white/35 uppercase">
        QR to live menu
      </p>
    </div>
  );
}

export function LoginSplit({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="flex h-full max-h-full min-h-0 flex-col overflow-hidden lg:flex-row">
      <aside className="relative hidden min-h-0 shrink-0 overflow-hidden bg-[#0B1220] text-white lg:flex lg:w-[52%] lg:flex-col lg:px-10 lg:py-7 xl:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 right-[-60px] size-[280px] rounded-full bg-[#51FE00]/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(81,254,0,0.5) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative z-10 shrink-0">
          <img
            src={ENGAZ_LOGO}
            alt="Engaz"
            className="h-9 w-auto max-w-[180px] object-contain xl:max-w-[200px]"
          />
          <h1 className="font-heading mt-5 text-[28px] font-semibold leading-tight tracking-tight xl:text-[32px]">
            Engaz Admin
          </h1>
          <p className="mt-1.5 text-sm text-[#51FE00]/80">Super-admin control center</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">
            Provision restaurants, manage QR menus, and monitor deployments from one place.
          </p>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-start py-4">
          <QrMotif />
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-2">
          <img
            src={ILC_LOGO}
            alt="ILC Soft"
            className="size-7 rounded-full bg-white object-contain p-0.5"
          />
          <span className="text-xs text-white/45">by ILC Soft</span>
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#F7F8FA] px-4 py-6 sm:px-6 lg:overflow-hidden lg:px-10 lg:py-8">
        <div className="login-fade-up w-full max-w-[380px]">{children}</div>
      </section>
    </div>
  );
}
