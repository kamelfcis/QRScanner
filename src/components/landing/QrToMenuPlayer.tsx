'use client';

import { useEffect, useState } from 'react';
import { Player } from '@remotion/player';
import {
  QrToMenu,
  QR_TO_MENU_FPS,
  QR_TO_MENU_FRAMES,
  QR_TO_MENU_HEIGHT,
  QR_TO_MENU_WIDTH,
} from '@/remotion/QrToMenu';

export function QrToMenuPlayer() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <Player
      component={QrToMenu}
      durationInFrames={QR_TO_MENU_FRAMES}
      compositionWidth={QR_TO_MENU_WIDTH}
      compositionHeight={QR_TO_MENU_HEIGHT}
      fps={QR_TO_MENU_FPS}
      autoPlay={!reduced}
      loop={!reduced}
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        borderRadius: 16,
      }}
    />
  );
}
