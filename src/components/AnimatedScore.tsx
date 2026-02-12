import { useState, useEffect, useRef } from "react";

interface AnimatedScoreProps {
  target: number;
  duration?: number;
}

const AnimatedScore = ({ target, duration = 1800 }: AnimatedScoreProps) => {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>();
  const prevTargetRef = useRef(0);

  useEffect(() => {
    const from = prevTargetRef.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Deceleration easing — mechanical instrument feel
      const eased = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevTargetRef.current = to;
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return (
    <span className="text-3xl font-black text-primary tabular-nums text-glow-gold">{current}</span>
  );
};

export default AnimatedScore;
