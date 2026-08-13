import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { ENGAZ_LOGO_ALT, ENGAZ_LOGO_SRC } from '@/lib/brand';
import { CARD_BORDER, CARD_SHADOW, ENGAZ_GREEN, ENGAZ_NAVY, ENGAZ_PAPER } from './palette';

export const ANALYTICS_PULSE_FPS = 30;
export const ANALYTICS_PULSE_FRAMES = 120;
export const ANALYTICS_PULSE_WIDTH = 720;
export const ANALYTICS_PULSE_HEIGHT = 480;

const BARS = [38, 52, 46, 70, 64, 88, 74];
const HOURS = ['10', '12', '14', '16', '18', '20', '22'];
const LINE = [28, 36, 34, 58, 62, 92, 70];

function linePath(width: number, height: number) {
  const step = width / (LINE.length - 1);
  return LINE.map((value, index) => {
    const x = index * step;
    const y = height - (value / 100) * height;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
}

export function AnalyticsPulse() {
  const frame = useCurrentFrame();
  const peak = interpolate(frame, [18, 72], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: ENGAZ_PAPER,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 620,
          height: 380,
          borderRadius: 24,
          background: '#fff',
          border: `1px solid ${CARD_BORDER}`,
          boxShadow: CARD_SHADOW,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 4, background: ENGAZ_GREEN }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px 8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Img src={ENGAZ_LOGO_SRC} alt={ENGAZ_LOGO_ALT} style={{ height: 26, width: 'auto' }} />
            <div>
              <div style={{ color: ENGAZ_NAVY, fontWeight: 800, fontSize: 16 }}>Peak hours</div>
              <div style={{ color: 'rgba(11,18,32,0.55)', fontSize: 12 }}>QR scans · live</div>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(81,254,0,0.16)',
              color: ENGAZ_NAVY,
              fontWeight: 800,
              fontSize: 13,
              borderRadius: 999,
              padding: '8px 12px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(interpolate(frame, [8, 80], [126, 248], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))} scans
          </div>
        </div>
        <div style={{ flex: 1, padding: '8px 28px 22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg
              viewBox="0 0 560 160"
              width="100%"
              height="100%"
              style={{ position: 'absolute', inset: 0 }}
              aria-hidden
            >
              <path
                d={linePath(560, 160)}
                fill="none"
                stroke={ENGAZ_NAVY}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.18}
              />
              <path
                d={linePath(560, 160)}
                fill="none"
                stroke={ENGAZ_GREEN}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="720"
                strokeDashoffset={720 - peak * 720}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 14,
                paddingTop: 24,
              }}
            >
              {BARS.map((h, i) => {
                const height = interpolate(frame, [6 + i * 4, 28 + i * 4], [8, h], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const isPeak = i === 5;
                return (
                  <div key={HOURS[i]} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${height}%`,
                        borderRadius: 10,
                        background: isPeak ? ENGAZ_GREEN : 'rgba(11,18,32,0.12)',
                        boxShadow: isPeak ? `0 8px 18px rgba(81,254,0,0.35)` : undefined,
                      }}
                    />
                    <span
                      style={{
                        color: ENGAZ_NAVY,
                        fontSize: 11,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        opacity: 0.7,
                      }}
                    >
                      {HOURS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
