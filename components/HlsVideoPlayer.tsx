import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsVideoPlayerProps {
  src: string;
  autoPlay?: boolean;
}

const HlsVideoPlayer: React.FC<HlsVideoPlayerProps> = ({ src, autoPlay = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
            video.play().catch(e => console.warn("Autoplay prevented:", e));
        }
      });
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      if (autoPlay) {
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.warn("Autoplay prevented:", e));
        });
      }
    }
  }, [src, autoPlay]);

  return (
    <video
      ref={videoRef}
      controls
      className="w-full h-full bg-black object-contain"
      playsInline
    />
  );
};

export default HlsVideoPlayer;
