/**
 * The shared Popover and Select primitives animate in with tailwindcss-animate classes that are not wrapped in
 * `motion-safe:`. Appended to their className, this switches the animation off for visitors who asked for less motion.
 */
export const NO_MOTION_WHEN_REDUCED =
  "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none";
