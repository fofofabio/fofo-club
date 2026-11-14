// Static guide-derived data for the WoW tab. Source: Method's WoW Forever
// hunter leveling guide (BM 31 / MM 20). Talent rank counts are the guide's
// bands arranged into a point order — verify exact ranks in game before
// trusting a specific row blindly.

export type TalentRow = {
  id: string;
  name: string;
  maxPoints: number;
  note?: string;
};

export type TalentPhase = {
  id: string;
  label: string;
  levels: string;
  rows: TalentRow[];
};

export const TALENT_PLAN: TalentPhase[] = [
  {
    id: "foundations",
    label: "Foundations",
    levels: "10–24",
    rows: [
      { id: "deadly-aspects", name: "Deadly Aspects", maxPoints: 5, note: "Strongest early talent — keep Aspect of the Hawk up at all times." },
      { id: "focused-fire", name: "Focused Fire", maxPoints: 2 },
      { id: "improved-revive-pet", name: "Improved Revive Pet", maxPoints: 2 },
      { id: "endurance-training", name: "Endurance Training", maxPoints: 1, note: "One point only, to unlock the next row." },
      { id: "pathfinding", name: "Pathfinding", maxPoints: 2, note: "Available at 20." },
      { id: "unleashed-fury-a", name: "Unleashed Fury (first points)", maxPoints: 3, note: "Passive pet + hawk damage." },
    ],
  },
  {
    id: "pet-power",
    label: "Pet Power & Bestial Wrath",
    levels: "25–40",
    rows: [
      { id: "summon-hawk", name: "Summon Hawk", maxPoints: 1, note: "Forever talent at 25 — the second big power spike." },
      { id: "bestial-swiftness", name: "Bestial Swiftness", maxPoints: 1, note: "Prerequisite for Intimidation." },
      { id: "unleashed-fury-b", name: "Unleashed Fury (to 4/5)", maxPoints: 1 },
      { id: "frenzy", name: "Frenzy", maxPoints: 4, note: "Kept at 4/5 per the guide." },
      { id: "intimidation", name: "Intimidation", maxPoints: 1, note: "3-second stun — escape tool too." },
      { id: "bestial-discipline", name: "Bestial Discipline", maxPoints: 2 },
      { id: "bestial-wrath", name: "Bestial Wrath", maxPoints: 1, note: "The capstone." },
      { id: "bm-flex", name: "Flex points (fill remaining BM)", maxPoints: 5, note: "Guide leaves these open — fill to 31 BM before swapping to MM." },
    ],
  },
  {
    id: "marksmanship",
    label: "Marksmanship",
    levels: "41–60",
    rows: [
      { id: "lethal-attacks", name: "Lethal Attacks", maxPoints: 5 },
      { id: "careful-aim", name: "Careful Aim", maxPoints: 3 },
      { id: "rapid-killing", name: "Rapid Killing", maxPoints: 2 },
      { id: "efficiency", name: "Efficiency", maxPoints: 5 },
      { id: "trueshot-aura", name: "Trueshot Aura", maxPoints: 1, note: "Arrives around 56." },
      { id: "mortal-shots", name: "Mortal Shots", maxPoints: 4, note: "Kept at 4/5 per the guide." },
    ],
  },
];

export type WeaponStep = {
  id: string;
  name: string;
  kind: "Gun" | "Bow";
  level: number;
  source: string;
  engineering?: number;
  libraryBooks?: number;
};

export const WEAPON_PATH: WeaponStep[] = [
  { id: "quilboar-blaster", name: "Quilboar Blaster", kind: "Gun", level: 29, source: "Razorfen Kraul quest (Horde)" },
  { id: "master-hunters", name: "Master Hunter's Rifle / Bow", kind: "Gun", level: 28, source: "Nesingwary chain in STV, starts with “Welcome To The Jungle” (guide recommends by 41)" },
  { id: "truthseeker", name: "Truthseeker's Bow", kind: "Bow", level: 40, source: "Turn in 25 library books at the faction library", libraryBooks: 25 },
  { id: "thorium-rifle", name: "Thorium Rifle", kind: "Gun", level: 47, source: "Engineering 260, BoE", engineering: 260 },
  { id: "dark-iron-rifle", name: "Dark Iron Rifle", kind: "Gun", level: 50, source: "Engineering 275, BoE", engineering: 275 },
];

export type ChecklistItem = {
  id: string;
  label: string;
  detail: string;
};

export const DONT_MISS: ChecklistItem[] = [
  {
    id: "dash-wild-taming",
    label: "Learn Dash via Wild Taming (lv 30+)",
    detail: "Tame a pet that already knows Dash, fight with it until “You have learned a new spell”, then teach Dash to your main pet. 40% pet speed for 15s.",
  },
  {
    id: "sleeping-bag",
    label: "Cozy Sleeping Bag quest chain",
    detail: "Multi-continent chain. Reward gives 1% XP per minute standing on it, up to 3%, lasting 2h (1h cooldown).",
  },
  {
    id: "nesingwary-start",
    label: "Start the Nesingwary chain in STV",
    detail: "“Welcome To The Jungle” — leads to the Master Hunter's Rifle/Bow.",
  },
  {
    id: "quilboar-blaster-quest",
    label: "Grab the Quilboar Blaster (RFK)",
    detail: "Horde-only Razorfen Kraul quest reward, usable at 29 — a free weapon upgrade.",
  },
  {
    id: "pet-training",
    label: "Pet training is current",
    detail: "The guide says to train as often as possible. Re-check Growl, Great Stamina and Natural Armor ranks after dings.",
  },
  {
    id: "mount-gold",
    label: "Save mount gold for 40",
    detail: "The mid-game boss fight is the ~90g mount + training bill.",
  },
];

export const BUFF_RITUAL: ChecklistItem[] = [
  { id: "campfire", label: "Sit at a campfire for 1 minute", detail: "Grants an hour of buffs (Basic / Journeyman / Expert kits)." },
  { id: "bag-refresh", label: "Refresh the sleeping bag XP buff", detail: "Stand on the Cozy Sleeping Bag — 1%/min up to 3% XP for 2h." },
  { id: "rested", label: "Check rested XP", detail: "A bubble every 8h in a rest area, every 32h logged out elsewhere. Log out in an inn." },
];

export const ROTATION_NOTES: string[] = [
  "Keep two hawks and your main pet out at all times from 25.",
  "Recast Summon Hawk at the last second (18s duration) — saves mana and GCDs.",
  "Arcane Shot is nearly redundant after 25: it shares a 6s cooldown with Summon Hawk. Use it about every third cast in long fights.",
  "Let the pet land a few hits before opening with ranged damage, or you pull aggro.",
  "Escape kit: Freezing Trap (20), Frost Trap (28, 60% slow), Feign Death (30), Intimidation stun.",
  "Upgrade spell ranks whenever possible — except Raptor Strike (dead after 10) and Arcane Shot.",
];

export type LevelMilestone = { level: number; what: string };

export const MILESTONES: LevelMilestone[] = [
  { level: 30, what: "Feign Death · Intimidation · Dash (Wild Taming)" },
  { level: 40, what: "Mount! · Truthseeker's Bow usable" },
  { level: 41, what: "Start Marksmanship points · Master Hunter's weapon sweet spot" },
  { level: 47, what: "Thorium Rifle (Engineering 260)" },
  { level: 50, what: "Dark Iron Rifle (Engineering 275)" },
  { level: 56, what: "Trueshot Aura" },
  { level: 60, what: "Done leveling — guide extends at full release" },
];
