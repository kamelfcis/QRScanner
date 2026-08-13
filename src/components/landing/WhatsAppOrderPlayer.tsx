'use client';

import { RemotionClipPlayer } from '@/components/landing/RemotionClipPlayer';
import {
  WhatsAppOrder,
  WHATSAPP_ORDER_FPS,
  WHATSAPP_ORDER_FRAMES,
  WHATSAPP_ORDER_HEIGHT,
  WHATSAPP_ORDER_WIDTH,
} from '@/remotion/WhatsAppOrder';

export function WhatsAppOrderPlayer() {
  return (
    <RemotionClipPlayer
      component={WhatsAppOrder}
      durationInFrames={WHATSAPP_ORDER_FRAMES}
      compositionWidth={WHATSAPP_ORDER_WIDTH}
      compositionHeight={WHATSAPP_ORDER_HEIGHT}
      fps={WHATSAPP_ORDER_FPS}
    />
  );
}
