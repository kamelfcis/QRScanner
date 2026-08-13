'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Player, type PlayerRef } from '@remotion/player';

type RemotionClipPlayerProps = {
  component: ComponentType;
  durationInFrames: number;
  compositionWidth: number;
  compositionHeight: number;
  fps: number;
};

export function RemotionClipPlayer({
  component,
  durationInFrames,
  compositionWidth,
  compositionHeight,
  fps,
}: RemotionClipPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);

    const node = wrapRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        const player = playerRef.current;
        if (!player) return;
        if (entry.isIntersecting && !mq.matches) {
          player.play();
        } else {
          player.pause();
        }
      },
      { threshold: 0.3, rootMargin: '40px' },
    );
    if (node) io.observe(node);

    return () => {
      mq.removeEventListener('change', sync);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <Player
        ref={playerRef}
        component={component}
        durationInFrames={durationInFrames}
        compositionWidth={compositionWidth}
        compositionHeight={compositionHeight}
        fps={fps}
        autoPlay={false}
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
    </div>
  );
}
