import { useState, useEffect, useRef } from "react";

interface AnimatedScoreProps {
  target: number;
  duration?: number;
}

const AnimatedScore = ({ target, duration = 1200 }: AnimatedScoreProps) => {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return (
    <span className="text-3xl font-black text-primary tabular-nums">{current}</span>
  );
};

export default AnimatedScore;
