'use client';

import { RemotionClipPlayer } from '@/components/landing/RemotionClipPlayer';
import {
  AnalyticsPulse,
  ANALYTICS_PULSE_FPS,
  ANALYTICS_PULSE_FRAMES,
  ANALYTICS_PULSE_HEIGHT,
  ANALYTICS_PULSE_WIDTH,
} from '@/remotion/AnalyticsPulse';

export function AnalyticsPulsePlayer() {
  return (
    <RemotionClipPlayer
      component={AnalyticsPulse}
      durationInFrames={ANALYTICS_PULSE_FRAMES}
      compositionWidth={ANALYTICS_PULSE_WIDTH}
      compositionHeight={ANALYTICS_PULSE_HEIGHT}
      fps={ANALYTICS_PULSE_FPS}
    />
  );
}
