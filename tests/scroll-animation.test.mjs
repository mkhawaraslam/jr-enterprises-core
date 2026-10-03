import assert from "node:assert/strict";
import test from "node:test";
import getScrollAnimation from "../utils/getScrollAnimation.js";

test("scroll reveals start offset and finish visible", () => {
  const animation = getScrollAnimation();
  assert.deepEqual(animation.offscreen, { y: 40, opacity: 0 });
  const revealed = animation.onscreen();
  assert.equal(revealed.y, 0);
  assert.equal(revealed.opacity, 1);
  assert.equal(revealed.transition.duration, 0.8);
  assert.equal(revealed.transition.bounce, 0);
});

test("elements can customize reveal timing", () => {
  const revealed = getScrollAnimation().onscreen({ duration: 1, delay: 0.12 });
  assert.equal(revealed.transition.duration, 1);
  assert.equal(revealed.transition.delay, 0.12);
});

test("reduced motion keeps content visible without movement or delay", () => {
  const animation = getScrollAnimation(true);
  assert.deepEqual(animation.offscreen, { y: 0, opacity: 1 });
  const revealed = animation.onscreen({ duration: 1, delay: 0.12 });
  assert.equal(revealed.y, 0);
  assert.equal(revealed.opacity, 1);
  assert.equal(revealed.transition.duration, 0);
  assert.equal(revealed.transition.delay, 0);
});
