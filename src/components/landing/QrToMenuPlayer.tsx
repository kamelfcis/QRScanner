'use client';

import { RemotionClipPlayer } from '@/components/landing/RemotionClipPlayer';
import {
  QrToMenu,
  QR_TO_MENU_FPS,
  QR_TO_MENU_FRAMES,
  QR_TO_MENU_HEIGHT,
  QR_TO_MENU_WIDTH,
} from '@/remotion/QrToMenu';

export function QrToMenuPlayer() {
  return (
    <RemotionClipPlayer
      component={QrToMenu}
      durationInFrames={QR_TO_MENU_FRAMES}
      compositionWidth={QR_TO_MENU_WIDTH}
      compositionHeight={QR_TO_MENU_HEIGHT}
      fps={QR_TO_MENU_FPS}
    />
  );
}
