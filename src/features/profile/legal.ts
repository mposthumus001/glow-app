/**
 * Beta draft legal / trust copy.
 * NOT final legal advice. Legal review required before public launch.
 */

export const LEGAL_DRAFT_BANNER =
  "Beta draft — not final legal advice. Formal legal review is required before public launch.";

export const PRIVACY_SECTIONS = [
  {
    title: "What Glow is",
    body: "Glow is a calm peer-support space for parents in Australia. It is not emergency care, medical care, or a crisis service.",
  },
  {
    title: "Location and Atlas",
    body: "Exact GPS is never displayed. You choose Hidden, State, or Suburb area. Suburb clusters only appear when enough parents are awake nearby (at least five).",
  },
  {
    title: "Your Circle",
    body: "Circle messages are visible to active members of your Circle. Reports and hide-for-me controls are private to you. There is no public member directory.",
  },
  {
    title: "Baby tracking",
    body: "Baby logs are private to your family. Tracking is informational only and is not medical advice.",
  },
  {
    title: "Account data",
    body: "Your email appears only in your own account settings. Display names are used in Circle contexts — please avoid sharing full legal names if that feels safer.",
  },
] as const;

export const SAFETY_SECTIONS = [
  {
    title: "Peer support only",
    body: "Glow offers peer connection between parents. It does not replace professional medical, mental health, or emergency services.",
  },
  {
    title: "If you are in danger",
    body: "If you or someone else is in immediate danger in Australia, call 000. For mental health support, contact Lifeline on 13 11 14.",
  },
  {
    title: "Circle safety tools",
    body: "You can report a message discreetly or hide a message for yourself. Reports are stored privately for future review. Automated moderation is not part of private beta.",
  },
  {
    title: "Calm and Baby",
    body: "Calm sounds are for comfort. Baby tracking helps you remember feeds and sleeps — it does not diagnose or predict health outcomes.",
  },
] as const;

export const TERMS_SECTIONS = [
  {
    title: "Private beta",
    body: "Glow is offered as a private beta. Features may change. Availability is not guaranteed.",
  },
  {
    title: "Your responsibilities",
    body: "Be kind. Do not share others’ private information. Do not use Glow to harass, exploit, or endanger anyone.",
  },
  {
    title: "Accounts",
    body: "You are responsible for keeping your sign-in details safe. You may request account deletion from Account settings; during beta, deletion is processed manually.",
  },
  {
    title: "Content",
    body: "You remain responsible for what you post in Circles. Glow may remove content that violates these draft terms once moderation tooling is available.",
  },
] as const;

export const ABOUT_MISSION =
  "Glow exists so no parent feels alone — calm, private, and human.";
