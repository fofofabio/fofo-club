// Static guide-derived data for the WoW tab.
// Talents/weapons/rotation: Method's WoW Forever hunter leveling guide (BM 31 / MM 20).
// Engineering route: Fabio's "Engineering 1–300 Leveling Guide" doc.

export const ENGINEERING_GUIDE_URL = "https://claude.ai/artifact/WHKcG6pPSMnNRBJPVLpFA5";

// ---------------------------------------------------------------------------
// Talents: one point per level, 10–60. State derives from character level.
// ---------------------------------------------------------------------------

export type TalentStep = {
  level: number;
  talent: string;
  rank: number;
  maxRank: number;
  phase: "Foundations" | "Pet Power & Bestial Wrath" | "Marksmanship";
  note?: string;
};

function expand(
  phase: TalentStep["phase"],
  startLevel: number,
  rows: Array<{ talent: string; ranks: number; note?: string }>,
): TalentStep[] {
  const steps: TalentStep[] = [];
  let level = startLevel;
  for (const row of rows) {
    for (let rank = 1; rank <= row.ranks; rank += 1) {
      steps.push({ level, talent: row.talent, rank, maxRank: row.ranks, phase, note: rank === 1 ? row.note : undefined });
      level += 1;
    }
  }
  return steps;
}

export const TALENT_STEPS: TalentStep[] = [
  ...expand("Foundations", 10, [
    { talent: "Deadly Aspects", ranks: 5, note: "Strongest early talent — keep Aspect of the Hawk up at all times." },
    { talent: "Focused Fire", ranks: 2 },
    { talent: "Improved Revive Pet", ranks: 2 },
    { talent: "Endurance Training", ranks: 1, note: "One point only, to unlock the next row." },
    { talent: "Pathfinding", ranks: 2 },
    { talent: "Unleashed Fury", ranks: 3, note: "Passive pet + hawk damage." },
  ]),
  ...expand("Pet Power & Bestial Wrath", 25, [
    { talent: "Summon Hawk", ranks: 1, note: "Forever talent — the second big power spike. Keep two hawks out at all times." },
    { talent: "Bestial Swiftness", ranks: 1, note: "Prerequisite for Intimidation." },
    { talent: "Unleashed Fury (4/5)", ranks: 1 },
    { talent: "Frenzy", ranks: 4, note: "Kept at 4/5 per the guide." },
    { talent: "Intimidation", ranks: 1, note: "3-second stun — escape tool too." },
    { talent: "Bestial Discipline", ranks: 2 },
    { talent: "Flex points (fill BM)", ranks: 5, note: "Guide leaves these open. They unlock the capstone row (30 points in BM)." },
    { talent: "Bestial Wrath", ranks: 1, note: "The capstone — your 31st point, at 40 alongside the mount." },
  ]),
  ...expand("Marksmanship", 41, [
    { talent: "Lethal Attacks", ranks: 5 },
    { talent: "Careful Aim", ranks: 3 },
    { talent: "Rapid Killing", ranks: 2 },
    { talent: "Efficiency", ranks: 5 },
    { talent: "Trueshot Aura", ranks: 1 },
    { talent: "Mortal Shots", ranks: 4, note: "Kept at 4/5 per the guide." },
  ]),
];

// ---------------------------------------------------------------------------
// Engineering route 1–300 (from the Engineering guide doc).
// ---------------------------------------------------------------------------

export type EngineeringStep = {
  from: number;
  to: number;
  craft: string;
  count: string;
  mats: string;
  note?: string;
};

export const ENGINEERING_ROUTE: EngineeringStep[] = [
  { from: 1, to: 30, craft: "Rough Blasting Powder", count: "60", mats: "60 Rough Stone", note: "Keep all for 51–75." },
  { from: 30, to: 50, craft: "Handful of Copper Bolts", count: "30", mats: "30 Copper Bar", note: "Keep all." },
  { from: 50, to: 51, craft: "Arclight Spanner", count: "1", mats: "6 Copper Bar", note: "Train Journeyman first (Nogg, Orgrimmar)." },
  { from: 51, to: 75, craft: "Rough Copper Bomb", count: "30", mats: "30 Copper Bar, 30 Bolts, 60 Rough Powder, 30 Linen", note: "Yellow from 60. Train before 75 or points are lost." },
  { from: 75, to: 90, craft: "Coarse Blasting Powder", count: "60", mats: "60 Coarse Stone", note: "Keep all." },
  { from: 90, to: 100, craft: "Coarse Dynamite", count: "20", mats: "60 Coarse Powder, 20 Linen" },
  { from: 100, to: 105, craft: "Silver Contact", count: "5", mats: "5 Silver Bar", note: "Or 5 Flying Tiger Goggles (30 Light Leather, 10 Tigerseye)." },
  { from: 105, to: 125, craft: "Bronze Tube", count: "25", mats: "50 Bronze Bar, 25 Weak Flux", note: "Keep 10. Train Expert at 125+ (Roxxik, Orgrimmar, 50s)." },
  { from: 125, to: 135, craft: "Standard Scope", count: "10", mats: "10 Bronze Tube, 10 Moss Agate", note: "Put one on your bow!" },
  { from: 135, to: 150, craft: "Heavy Blasting Powder + Whirring Bronze Gizmo", count: "30 + 15", mats: "30 Heavy Stone · 30 Bronze Bar, 15 Wool", note: "Keep the gizmos." },
  { from: 150, to: 160, craft: "Bronze Framework", count: "15", mats: "30 Bronze Bar, 15 Medium Leather, 15 Wool", note: "Keep all. Bank Medium Leather before dropping Skinning." },
  { from: 160, to: 175, craft: "Explosive Sheep", count: "15", mats: "30 Heavy Powder, 15 Gizmo, 15 Framework, 30 Wool", note: "Keep 5 if going Goblin." },
  { from: 175, to: 194, craft: "Solid Blasting Powder", count: "60", mats: "120 Solid Stone", note: "Keep all." },
  { from: 194, to: 195, craft: "Gyromatic Micro-Adjustor", count: "1", mats: "4 Steel Bar", note: "Or Iron Grenades if short." },
  { from: 195, to: 200, craft: "Mithril Tube", count: "6", mats: "18 Mithril Bar", note: "Keep all if going Gnomish. At 200: specialization + Artisan (Gadgetzan)." },
  { from: 200, to: 215, craft: "Unstable Trigger", count: "20", mats: "20 Mithril Bar, 20 Mageweave, 20 Solid Powder", note: "Keep all." },
  { from: 215, to: 238, craft: "Mithril Casing", count: "40", mats: "120 Mithril Bar", note: "Keep all." },
  { from: 238, to: 250, craft: "Hi-Explosive Bomb", count: "20", mats: "40 Casing, 20 Trigger, 40 Solid Powder" },
  { from: 250, to: 260, craft: "Dense Blasting Powder", count: "30+", mats: "60 Dense Stone", note: "Yellow from 250 — buy extra Dense Stone." },
  { from: 260, to: 285, craft: "Thorium Widget", count: "35", mats: "105 Thorium Bar, 35 Runecloth", note: "Schematic: Sovik, Orgrimmar." },
  { from: 285, to: 300, craft: "Thorium Tube", count: "20", mats: "120 Thorium Bar", note: "Schematic: Xizzer Fizzbolt, Everlook — bind on pickup, buy it yourself." },
];

export const ENGINEERING_NOTES: string[] = [
  "Artisan trainer: Buzzek Bracketswing in Gadgetzan, by the mailbox outside the inn.",
  "Specialization lean: Gnomish (Accurate Scope for your bow, teleporter to Gadgetzan = Artisan trainer).",
  "Legacy Points at 150, 225 and 300 — first time each.",
  "Cost: ~13g if you mine everything, ~84g buying all mats. Smelt your own bars.",
  "Save all Linen, Wool, Mageweave and Runecloth from quest mobs starting now.",
];

// ---------------------------------------------------------------------------
// Zone route (Horde, classic-standard — adjust as Forever diverges).
// ---------------------------------------------------------------------------

export type ZoneStep = { from: number; to: number; zones: string; note?: string };

export const ZONE_ROUTE: ZoneStep[] = [
  { from: 25, to: 31, zones: "Thousand Needles · Hillsbrad Foothills", note: "Finish up, grab flight paths." },
  { from: 30, to: 35, zones: "Desolace · Stranglethorn Vale", note: "Start Nesingwary in STV — weapon chain." },
  { from: 35, to: 40, zones: "Dustwallow Marsh · Badlands · Swamp of Sorrows", note: "Grab the Gadgetzan flight path for the Artisan trainer." },
  { from: 40, to: 45, zones: "Tanaris · Feralas · The Hinterlands", note: "Gadgetzan = Artisan trainer + Gnomish teleporter target." },
  { from: 45, to: 50, zones: "Searing Gorge · Blasted Lands · Un'Goro Crater", note: "Thorium Rifle at eng 260." },
  { from: 50, to: 55, zones: "Western Plaguelands · Felwood · Burning Steppes", note: "" },
  { from: 55, to: 60, zones: "Eastern Plaguelands · Winterspring · Silithus", note: "Everlook: buy the Thorium Tube schematic in person." },
];

// ---------------------------------------------------------------------------
// Milestones & goals: a checkable timeline ordered by level.
// ---------------------------------------------------------------------------

export type Milestone = {
  id: string;
  level: number | null; // null = no level gate
  label: string;
  detail: string;
  // done automatically once Engineering reaches this skill
  autoSkill?: number;
  // optional sub-tasks, tracked as "<goal id>:<step id>" in the checked list
  steps?: { id: string; label: string }[];
};

export const MILESTONE_GOALS: Milestone[] = [
  { id: "quilboar-blaster", level: 29, label: "Quilboar Blaster (RFK quest)", detail: "Horde-only Razorfen Kraul reward — free gun upgrade, still worth grabbing." },
  { id: "dash-wild-taming", level: 30, label: "Learn Dash via Wild Taming", detail: "Tame a pet that knows Dash, fight until “You have learned a new spell”, teach it to your main pet." },
  { id: "nesingwary-start", level: 31, label: "Start Nesingwary chain in STV", detail: "“Welcome To The Jungle” — leads to the Master Hunter's Rifle/Bow (sweet spot ~41)." },
  { id: "sleeping-bag", level: null, label: "Cozy Sleeping Bag quest chain", detail: "Multi-continent chain → 1–3% XP buff for 2h standing on it. Do it on a travel day." },
  { id: "artisan-eng", level: null, label: "Train Artisan Engineering", detail: "Buzzek Bracketswing in Gadgetzan — needed from skill 200 onward.", autoSkill: 201 },
  { id: "gnomish-spec", level: null, label: "Engineering specialization at 200", detail: "Lean: Gnomish. Pick up the quest from the Artisan trainer, then hand in:",
    steps: [
      { id: "tubes", label: "6 Mithril Tube (keep them from the 195–200 step)" },
      { id: "scope", label: "1 Accurate Scope (schematic: Mazk Snipeshot, Booty Bay)" },
      { id: "dummies", label: "2 Advanced Target Dummy" },
    ] },
  { id: "mount-gold", level: 40, label: "Mount + riding (~90g saved)", detail: "The mid-game boss fight. Start saving now; skip AH toys." },
  { id: "truthseeker", level: 40, label: "Truthseeker's Bow — 25 library books", detail: "Turn in 25 library books at the faction library." },
  { id: "master-hunters", level: 41, label: "Master Hunter's Rifle / Bow", detail: "Finish the Nesingwary chain around 41 for the best payoff." },
  { id: "legacy-150", level: null, label: "Engineering 150 — first Legacy Point", detail: "Then 225 and 300. Legacy talents Working Overtime / Dedicated Study speed up skill gains.", autoSkill: 150 },
  { id: "thorium-rifle", level: 47, label: "Thorium Rifle (Engineering 260)", detail: "Craftable upgrade, BoE." },
  { id: "dark-iron-rifle", level: 50, label: "Dark Iron Rifle (Engineering 275)", detail: "Craftable upgrade, BoE." },
  { id: "trueshot", level: 56, label: "Trueshot Aura", detail: "Marksmanship capstone for leveling." },
];

export const LIBRARY_BOOKS_TARGET = 25;

// ---------------------------------------------------------------------------
// Gold: crafts worth selling (Engineering) and hunter farms. Prices are
// Nov 13 2026 AH estimates (timesaver.gg) — volatile, check the AH first.
// ---------------------------------------------------------------------------

export type GoldCraft = {
  name: string;
  skill: number;
  verdict: "sell" | "later" | "skip";
  profit: string;
  detail: string;
};

export const GOLD_CRAFTS: GoldCraft[] = [
  { name: "Hoof-Shaped Foot Pedal", skill: 140, verdict: "sell", profit: "+1.5g each (EU)", detail: "New centaur toy, anyone can use it. Schematic from Gorhak in Desolace (30s). Mats ~85s." },
  { name: "No Slip SAF-T Padding", skill: 145, verdict: "sell", profit: "+33s each (EU)", detail: "Crafting part for SAF-T recipes. Heavy Leather + Magenta Dye. Steady small margin." },
  { name: "EZ-Thro Bronze Mortar", skill: 190, verdict: "later", profit: "+1.5g each", detail: "No engineering requirement to use, so it sells to everyone." },
  { name: "Deadly Scope", skill: 210, verdict: "later", profit: "+16s EU / +79s US", detail: "Other hunters buy it — you're your own first customer." },
  { name: "Goblin Rocket Boots", skill: 225, verdict: "later", profit: "+2.4g each (EU)", detail: "Best engineering margin. Schematic drops in Gnomeregan." },
  { name: "Sniper Scope", skill: 240, verdict: "later", profit: "+48s EU", detail: "Scope upgrade for hunters at 50+." },
  { name: "Grenades (Iron / Thorium)", skill: 175, verdict: "skip", profit: "loss", detail: "Iron Grenade vendor price was cut to 1s 25c, and the AH is flooded. Thorium Grenades list below mat cost." },
];

export const GOLD_TIPS: Array<{ title: string; detail: string }> = [
  { title: "Engineering is a small shop, not a money printer", detail: "Margins are per-item silver to low gold. Mining is the real earner — sell surplus bars and stone you won't need for the route." },
  { title: "Solo Scarlet Monastery Graveyard (32–40)", detail: "Forever tunes it for 30–38. Pull the first chamber, then the graveyard, Vishas, Thalnos. Silk Cloth sells well, blues sell or get disenchanted. Watch Azshir's fear — Freezing Trap + Feign Death." },
  { title: "Blackfathom Deeps solo (from 30)", detail: "Seven bosses up to Aku'mai. Feign Death resets bad pulls. Vendor trash plus greens and blues." },
  { title: "Skin what your pet kills", detail: "New Pristine Leather, Hide and Scale are scarce Forever skins. Check AH prices before vendoring anything \"pristine\"." },
  { title: "Never vendor cloth", detail: "Wool, Silk and Mageweave feed your engineering route (and tailors pay for the rest)." },
  { title: "List small, list on the faction AH", detail: "The faction house takes 5%; neutral goblin houses take 15%. Test a few listings before crafting a stack, and don't count unsold stock as gold." },
  { title: "Save for 40 first", detail: "Mount + riding is ~90g. Skip AH toys and greens you'll outlevel in two dings." },
];

// ---------------------------------------------------------------------------
// Session ritual + rotation (Forever-specific QoL).
// ---------------------------------------------------------------------------

export type RitualItem = { id: string; label: string; detail: string };

export const BUFF_RITUAL: RitualItem[] = [
  { id: "campfire", label: "Sit at a campfire for 1 minute", detail: "Grants an hour of buffs (Basic / Journeyman / Expert kits)." },
  { id: "bag-refresh", label: "Refresh the sleeping bag XP buff", detail: "Stand on the Cozy Sleeping Bag — 1%/min up to 3% XP for 2h." },
  { id: "rested", label: "Check rested XP", detail: "A bubble every 8h in a rest area, every 32h logged out elsewhere. Log out in an inn." },
  { id: "pet-training", label: "Pet training current?", detail: "Re-check Growl, Great Stamina and Natural Armor ranks after dings." },
];

export const ROTATION_NOTES: string[] = [
  "Keep two hawks and your main pet out at all times from 25.",
  "Recast Summon Hawk at the last second (18s duration) — saves mana and GCDs.",
  "Arcane Shot is nearly redundant after 25: shares a 6s cooldown with Summon Hawk. Use it about every third cast in long fights.",
  "Let the pet land a few hits before opening with ranged damage, or you pull aggro.",
  "Escape kit: Freezing Trap (20), Frost Trap (28, 60% slow), Feign Death (30), Intimidation stun.",
  "Upgrade spell ranks whenever possible — except Raptor Strike (dead after 10) and Arcane Shot.",
];

// ---------------------------------------------------------------------------
// XP needed to go from level N to N+1 (Classic 1.12 table; Forever may differ)
// ---------------------------------------------------------------------------

export const XP_TO_NEXT_LEVEL: Record<number, number> = {
  1: 400, 2: 900, 3: 1400, 4: 2100, 5: 2800, 6: 3600, 7: 4500, 8: 5400, 9: 6500, 10: 7600,
  11: 8800, 12: 10100, 13: 11400, 14: 12900, 15: 14400, 16: 16000, 17: 17700, 18: 19400, 19: 21300, 20: 23200,
  21: 25200, 22: 27300, 23: 29400, 24: 31700, 25: 34000, 26: 36400, 27: 38900, 28: 41400, 29: 44300, 30: 47400,
  31: 50800, 32: 54500, 33: 58600, 34: 62800, 35: 67100, 36: 71600, 37: 76100, 38: 80800, 39: 85700, 40: 90700,
  41: 95800, 42: 101000, 43: 106300, 44: 111800, 45: 117500, 46: 123200, 47: 129100, 48: 135100, 49: 141200, 50: 147500,
  51: 153900, 52: 160400, 53: 167100, 54: 173900, 55: 180800, 56: 187900, 57: 195000, 58: 202300, 59: 209800,
};

// Total XP earned since level 1, given a level and the XP into that level.
export function totalXp(level: number, experience: number): number {
  let total = experience;
  for (let l = 1; l < level; l++) total += XP_TO_NEXT_LEVEL[l] ?? 0;
  return total;
}

// Fractional level for a total XP amount (e.g. 34.65).
export function levelFromTotalXp(total: number): number {
  let level = 1;
  let rest = total;
  while (level < 60 && rest >= (XP_TO_NEXT_LEVEL[level] ?? Infinity)) {
    rest -= XP_TO_NEXT_LEVEL[level];
    level++;
  }
  return level >= 60 ? 60 : level + rest / XP_TO_NEXT_LEVEL[level];
}
