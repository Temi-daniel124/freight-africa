// Motion tokens from DESIGN_SYSTEM.md section 12.2, for components using Motion.
export const springUi = { type: "spring", stiffness: 260, damping: 24, mass: 0.9 } as const;
export const springSoft = { type: "spring", stiffness: 140, damping: 22, mass: 0.8 } as const;
export const easeSettle = [0.2, 0.8, 0.2, 1] as const;
export const gentle = { duration: 0.4, ease: easeSettle } as const;
export const staggerStep = 0.04;
