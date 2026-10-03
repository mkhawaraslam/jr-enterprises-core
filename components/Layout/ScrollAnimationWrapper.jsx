import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import getScrollAnimation from "../../utils/getScrollAnimation";

export default function ScrollAnimationWrapper({
  as = "div",
  children,
  className,
  viewport,
  ...props
}) {
  const reducedMotion = useReducedMotion();
  const scrollAnimation = useMemo(
    () => getScrollAnimation(reducedMotion),
    [reducedMotion]
  );
  const Component = motion[as];

  return (
    <Component
      initial={reducedMotion ? false : "offscreen"}
      animate={reducedMotion ? "onscreen" : undefined}
      whileInView="onscreen"
      variants={scrollAnimation}
      viewport={{ once: true, amount: 0.2, ...viewport }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}
