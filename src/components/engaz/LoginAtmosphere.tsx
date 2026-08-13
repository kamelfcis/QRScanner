const ENGAZ_LOGO = '/brand/engaz-logo.png';

const TILE = 13;
const GAP = 6;
const STEP = TILE + GAP;
const WALL_COLS = 10;
const WALL_ROWS = 8;

/** One QR-like tile flattened into a single path so the whole wall stays cheap to paint. */
function qrTilePath(seed: number): string {
  let d = '';
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const finder = (x < 3 && y < 3) || (x > TILE - 4 && y < 3) || (x < 3 && y > TILE - 4);
      const timing = (x === 5 || y === 5) && (x + y) % 2 === 0;
      const data = (x * 7 + y * 13 + seed * 11) % 5 === 0;
      if (finder || timing || data) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
}

const TILE_VARIANTS = [0, 1, 2, 3].map(qrTilePath);

const WALL_TILES = Array.from({ length: WALL_COLS * WALL_ROWS }, (_, i) => {
  const col = i % WALL_COLS;
  const row = Math.floor(i / WALL_COLS);
  return {
    key: `${col}-${row}`,
    x: col * STEP,
    y: row * STEP,
    variant: (col * 3 + row * 5) % TILE_VARIANTS.length,
    live: (col * 7 + row * 13) % 11 === 0,
  };
});

const WALL_MASK =
  'radial-gradient(115% 85% at 50% -5%, #000 12%, rgba(0,0,0,0.34) 48%, transparent 80%)';

function QrWall() {
  return (
    <div
      className="absolute inset-0 opacity-[0.55]"
      style={{ maskImage: WALL_MASK, WebkitMaskImage: WALL_MASK }}
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${WALL_COLS * STEP} ${WALL_ROWS * STEP}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          {TILE_VARIANTS.map((d, i) => (
            <path key={i} id={`engaz-qr-tile-${i}`} d={d} />
          ))}
        </defs>
        {WALL_TILES.map((tile) => (
          <use
            key={tile.key}
            href={`#engaz-qr-tile-${tile.variant}`}
            x={tile.x}
            y={tile.y}
            fill={tile.live ? '#51FE00' : '#9BB2CE'}
            opacity={tile.live ? 0.5 : 0.2}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Full-bleed background for the login route: navy control-room wash, a wall of faint
 * QR tiles, a drifting oversized Engaz mark, and one slow light sweep across it all.
 * The logo PNG ships on a black plate, so `screen` blending drops the plate and keeps
 * only the lime/white artwork as a watermark.
 */
export function LoginAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(90% 70% at 10% -12%, rgba(81,254,0,0.11), transparent 60%)',
            'radial-gradient(70% 60% at 78% 52%, rgba(28,60,140,0.20), transparent 62%)',
            'radial-gradient(60% 55% at 46% 112%, rgba(81,254,0,0.06), transparent 60%)',
            'linear-gradient(160deg, #0B1220 0%, #080D18 54%, #060A12 100%)',
          ].join(','),
        }}
      />

      <QrWall />

      <img
        src={ENGAZ_LOGO}
        alt=""
        className="login-drift absolute -bottom-[16%] -left-[14%] w-[126vw] max-w-[600px] opacity-[0.13] blur-[1px] lg:hidden"
        style={{ mixBlendMode: 'screen' }}
      />
      <img
        src={ENGAZ_LOGO}
        alt=""
        className="login-drift absolute top-[16%] left-[19%] hidden w-[38vw] max-w-[520px] opacity-[0.11] blur-[1px] lg:block"
        style={{ mixBlendMode: 'screen' }}
      />

      <div className="login-sweep" />

      <div className="absolute inset-y-0 left-[52%] hidden w-px bg-gradient-to-b from-transparent via-[#51FE00]/20 to-transparent lg:block" />
    </div>
  );
}
