import type { ReactNode } from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ENGAZ_GREEN, ENGAZ_NAVY, ENGAZ_PAPER, WA_GREEN } from './palette';

export const WHATSAPP_ORDER_FPS = 30;
export const WHATSAPP_ORDER_FRAMES = 120;
export const WHATSAPP_ORDER_WIDTH = 480;
export const WHATSAPP_ORDER_HEIGHT = 640;

const ITEMS = [
  { name: 'Grill platter', price: '45' },
  { name: 'Fattoush', price: '22' },
  { name: 'Cardamom coffee', price: '18' },
] as const;

function PhoneChrome({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 320,
        height: 560,
        borderRadius: 36,
        background: '#fff',
        border: '1px solid rgba(11,18,32,0.08)',
        boxShadow: '0 22px 48px rgba(11,18,32,0.12)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: 4,
          background: ENGAZ_GREEN,
          flexShrink: 0,
        }}
      />
      {children}
    </div>
  );
}

function CartScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: ENGAZ_PAPER,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <PhoneChrome>
        <div style={{ padding: '22px 20px 16px' }}>
          <div style={{ color: ENGAZ_NAVY, fontSize: 13, fontWeight: 700, letterSpacing: 1.4 }}>
            CART
          </div>
          <div style={{ color: ENGAZ_NAVY, fontSize: 22, fontWeight: 800, marginTop: 4 }}>
            Table 12
          </div>
        </div>
        <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ITEMS.map((item, index) => {
            const enter = spring({
              frame: Math.max(0, frame - 8 - index * 8),
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={item.name}
                style={{
                  transform: `translateX(${(1 - enter) * 28}px)`,
                  opacity: enter,
                  background: '#f7f8fa',
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 52,
                }}
              >
                <span style={{ color: ENGAZ_NAVY, fontWeight: 600, fontSize: 15 }}>{item.name}</span>
                <span style={{ color: ENGAZ_NAVY, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  {item.price}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 16 }}>
          <div
            style={{
              height: 48,
              borderRadius: 14,
              background: `linear-gradient(90deg, ${WA_GREEN}, ${ENGAZ_GREEN})`,
              color: '#041200',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              transform: `scale(${interpolate(frame, [50, 62], [1, 1.04], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })})`,
            }}
          >
            Send on WhatsApp
          </div>
        </div>
      </PhoneChrome>
    </AbsoluteFill>
  );
}

function BubbleScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 13 } });

  return (
    <AbsoluteFill
      style={{
        background: ENGAZ_PAPER,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <PhoneChrome>
        <div
          style={{
            background: WA_GREEN,
            padding: '18px 20px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: ENGAZ_GREEN,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#041200',
              fontSize: 13,
            }}
          >
            E
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Engaz Kitchen</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>online</div>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: '#ece5dd',
            padding: 18,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              transform: `translateY(${(1 - enter) * 36}px)`,
              opacity: enter,
              maxWidth: 240,
              background: '#dcf8c6',
              borderRadius: '18px 18px 4px 18px',
              padding: '14px 16px',
              boxShadow: '0 8px 18px rgba(11,18,32,0.08)',
            }}
          >
            <div style={{ color: ENGAZ_NAVY, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
              New table order
            </div>
            {ITEMS.map((item) => (
              <div
                key={item.name}
                style={{
                  color: ENGAZ_NAVY,
                  fontSize: 13,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  lineHeight: 1.6,
                }}
              >
                <span>1× {item.name}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.price}</span>
              </div>
            ))}
            <div
              style={{
                marginTop: 10,
                color: WA_GREEN,
                fontSize: 11,
                fontWeight: 700,
                textAlign: 'right',
              }}
            >
              Sent ✓✓
            </div>
          </div>
        </div>
      </PhoneChrome>
    </AbsoluteFill>
  );
}

export function WhatsAppOrder() {
  const frame = useCurrentFrame();
  const cartOpacity = interpolate(frame, [0, 8, 58, 70], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bubbleOpacity = interpolate(frame, [62, 74], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: ENGAZ_PAPER }}>
      <AbsoluteFill style={{ opacity: cartOpacity }}>
        <CartScene />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: bubbleOpacity }}>
        <BubbleScene />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
