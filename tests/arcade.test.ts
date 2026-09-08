import { test } from "node:test";
import assert from "node:assert/strict";
import { animationsEnabled, isPageNavigation, createNavigationTimer } from "../lib/arcade";
test("animation preference respects device reduction and persisted opt-out", () => {
  assert.equal(animationsEnabled(null, false), true);
  assert.equal(animationsEnabled("off", false), false);
  assert.equal(animationsEnabled("on", true), false);
  assert.equal(animationsEnabled(null, true), false);
});
test("navigation ignores external and same-page links but includes season changes", () => {
  const current = "https://pinpong.test/protected/seasons?season=autumn";
  assert.equal(isPageNavigation("#results", current), false);
  assert.equal(isPageNavigation(current, current), false);
  assert.equal(isPageNavigation("https://other.test/a", current), false);
  assert.equal(isPageNavigation("?season=summer", current), true);
  assert.equal(isPageNavigation("/protected", current), true);
});
test("fast navigation never flashes; pending navigation and replacement clean up", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const states: boolean[] = [];
  const timer = createNavigationTimer(v => states.push(v));
  timer.start(); t.mock.timers.tick(149);
  assert.equal(states.includes(true), false);
  timer.stop(); t.mock.timers.tick(1000);
  assert.equal(states.includes(true), false);
  timer.start(); t.mock.timers.tick(150); assert.equal(states.at(-1), true);
  timer.start(); assert.equal(states.at(-1), false);
  t.mock.timers.tick(150); assert.equal(states.at(-1), true);
  timer.stop(); t.mock.timers.tick(10000); assert.equal(states.at(-1), false);
});
test("abandoned navigation has a bounded indicator lifetime", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let visible = false;
  const timer = createNavigationTimer(v => { visible = v; });
  timer.start(); t.mock.timers.tick(150); assert.equal(visible, true);
  t.mock.timers.tick(9850); assert.equal(visible, false);
});
