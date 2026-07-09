export const tonightMock = {
  user: {
    name: "Melissa",
  },
  greeting: "Good evening",
  awakeCount: 1955,
  awakeTogether: {
    label: "Awake Together",
    subtitle: "You're not alone tonight. 💜",
  },
  circle: {
    title: "Tonight, your Circle is here ❤️",
    name: "The Dream Feeders 🌙",
    awakeParents: 6,
    babies: "5mo – 11mo",
    location: "VIC",
    cta: "Enter Circle",
  },
  reminder: {
    title: "Tonight's Reminder",
    lines: ["You are doing better than you think.", "And that is enough."],
  },
  map: {
    tagline: "Every light is another parent awake tonight.",
    states: [
      { code: "NSW", count: 487, x: 78, y: 42 },
      { code: "VIC", count: 412, x: 72, y: 62 },
      { code: "QLD", count: 318, x: 82, y: 24 },
      { code: "WA", count: 245, x: 22, y: 48 },
      { code: "SA", count: 178, x: 58, y: 52 },
      { code: "TAS", count: 94, x: 80, y: 78 },
    ],
    dots: [
      { x: 30, y: 35, size: 3, delay: 0 },
      { x: 45, y: 28, size: 2, delay: 0.4 },
      { x: 55, y: 45, size: 3, delay: 0.8 },
      { x: 68, y: 38, size: 2, delay: 1.2 },
      { x: 75, y: 55, size: 4, delay: 0.2 },
      { x: 38, y: 58, size: 2, delay: 1.6 },
      { x: 62, y: 68, size: 3, delay: 0.6 },
      { x: 48, y: 22, size: 2, delay: 1.0 },
      { x: 85, y: 48, size: 2, delay: 1.4 },
      { x: 72, y: 72, size: 3, delay: 0.3 },
      { x: 25, y: 62, size: 2, delay: 0.9 },
      { x: 90, y: 30, size: 2, delay: 1.8 },
    ],
  },
} as const;
