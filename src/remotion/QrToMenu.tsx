import { useMemo } from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Lottie, type LottieAnimationData } from '@remotion/lottie';
import { ENGAZ_LOGO_ALT, ENGAZ_LOGO_SRC } from '@/lib/brand';
import qrScanAnimation from '../../public/lottie/qr-scan.json';
import { CARD_BORDER, CARD_SHADOW, ENGAZ_GREEN as GREEN, ENGAZ_NAVY as NAVY, ENGAZ_PAPER as PAPER } from './palette';

export const QR_TO_MENU_FPS = 30;
export const QR_TO_MENU_FRAMES = 180;
export const QR_TO_MENU_WIDTH = 960;
export const QR_TO_MENU_HEIGHT = 720;

function fade(frame: number, start: number, end: number) {
  return interpolate(frame, [start, start + 8, end - 8, end], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function TableQr() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const cells = useMemo(
    () =>
      Array.from({ length: 13 * 13 }, (_, i) => {
        const x = i % 13;
        const y = Math.floor(i / 13);
        const finder = (x < 3 && y < 3) || (x > 9 && y < 3) || (x < 3 && y > 9);
        const filled = finder || ((x * 7 + y * 13) % 5 === 0 && !finder);
        return { i, filled, finder };
      }),
    [],
  );

  return (
    <AbsoluteFill
      style={{
        opacity: fade(frame, 0, 54),
        alignItems: 'center',
        justifyContent: 'center',
        background: PAPER,
      }}
    >
      <div
        style={{
          transform: `scale(${0.86 + enter * 0.14})`,
          width: 280,
          height: 340,
          borderRadius: 24,
          background: '#fff',
          border: `1px solid ${CARD_BORDER}`,
          boxShadow: CARD_SHADOW,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 4, width: '100%', background: GREEN, marginTop: -16 }} />
        <Img src={ENGAZ_LOGO_SRC} alt={ENGAZ_LOGO_ALT} style={{ height: 36, width: 'auto' }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(13, 1fr)',
            width: 168,
            height: 168,
            gap: 2,
            padding: 10,
            borderRadius: 12,
            border: `2px solid ${GREEN}`,
            background: '#fff',
          }}
        >
          {cells.map((cell) => (
            <span
              key={cell.i}
              style={{
                background: cell.filled ? NAVY : 'transparent',
                borderRadius: cell.finder ? 1 : 0,
              }}
            />
          ))}
        </div>
        <span style={{ color: NAVY, fontSize: 13, fontWeight: 600, letterSpacing: 2 }}>QR</span>
      </div>
    </AbsoluteFill>
  );
}

function ScanBeam() {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 54], [-20, 220], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        opacity: fade(frame, 0, 54),
        alignItems: 'center',
        justifyContent: 'center',
        background: PAPER,
      }}
    >
      <div style={{ position: 'relative', width: 280, height: 280 }}>
        <Lottie
          animationData={qrScanAnimation as LottieAnimationData}
          style={{ width: 280, height: 280 }}
        />
        <div
          style={{
            position: 'absolute',
            insetInline: 24,
            top: y,
            height: 3,
            borderRadius: 99,
            background: `linear-gradient(90deg, transparent, ${GREEN}, transparent)`,
            boxShadow: `0 0 18px ${GREEN}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function MenuCards() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dishes = ['Grill', 'Salad', 'Coffee'];

  return (
    <AbsoluteFill
      style={{
        opacity: fade(frame, 0, 54),
        alignItems: 'center',
        justifyContent: 'center',
        background: PAPER,
        gap: 12,
        flexDirection: 'row',
        padding: 40,
      }}
    >
      {dishes.map((name, index) => {
        const enter = spring({
          frame: Math.max(0, frame - index * 6),
          fps,
          config: { damping: 12 },
        });
        return (
          <div
            key={name}
            style={{
              transform: `translateY(${(1 - enter) * 28}px)`,
              opacity: enter,
              width: 170,
              height: 210,
              borderRadius: 20,
              background: '#fff',
              border: `1px solid ${CARD_BORDER}`,
              boxShadow: CARD_SHADOW,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ height: 4, background: GREEN }} />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <div
                style={{
                  height: 92,
                  borderRadius: 14,
                  background: index === 1 ? 'rgba(81,254,0,0.18)' : 'rgba(11,18,32,0.06)',
                }}
              />
              <strong style={{ color: NAVY, fontSize: 16 }}>{name}</strong>
              <span style={{ color: GREEN, fontWeight: 700, fontSize: 14 }}>QR menu</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function DashboardPulse() {
  const frame = useCurrentFrame();
  const bars = [42, 68, 54, 86, 70, 92];

  return (
    <AbsoluteFill
      style={{
        opacity: fade(frame, 0, 54),
        alignItems: 'center',
        justifyContent: 'center',
        background: PAPER,
      }}
    >
      <div
        style={{
          width: 460,
          height: 280,
          borderRadius: 24,
          background: '#fff',
          border: `1px solid ${CARD_BORDER}`,
          boxShadow: CARD_SHADOW,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 4, background: GREEN }} />
        <div style={{ padding: '20px 24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Img src={ENGAZ_LOGO_SRC} alt={ENGAZ_LOGO_ALT} style={{ height: 28, width: 'auto' }} />
            <div>
              <div style={{ color: NAVY, fontWeight: 800 }}>Dashboard</div>
              <div style={{ color: 'rgba(11,18,32,0.5)', fontSize: 12 }}>Peak hour · 20:00</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 150 }}>
            {bars.map((h, i) => {
              const height = interpolate(frame, [4 + i * 3, 28 + i * 3], [8, h], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${height}%`,
                    borderRadius: 10,
                    background: i === bars.length - 1 ? GREEN : 'rgba(11,18,32,0.12)',
                    boxShadow: i === bars.length - 1 ? '0 8px 16px rgba(81,254,0,0.28)' : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function QrToMenu() {
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Sequence from={0} durationInFrames={55}>
        <TableQr />
      </Sequence>
      <Sequence from={40} durationInFrames={55}>
        <ScanBeam />
      </Sequence>
      <Sequence from={80} durationInFrames={55}>
        <MenuCards />
      </Sequence>
      <Sequence from={125} durationInFrames={55}>
        <DashboardPulse />
      </Sequence>
    </AbsoluteFill>
  );
}
