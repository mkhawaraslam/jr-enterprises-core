export default function getScrollAnimation(reducedMotion = false) {
  return {
    offscreen: {
      y: reducedMotion ? 0 : 40,
      opacity: reducedMotion ? 1 : 0,
    },
    onscreen: ({ duration = 0.8, delay = 0 } = {}) => ({
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        duration: reducedMotion ? 0 : duration,
        delay: reducedMotion ? 0 : delay,
        bounce: 0,
      },
    }),
  };
}
