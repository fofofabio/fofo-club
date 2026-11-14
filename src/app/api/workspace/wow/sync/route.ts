import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fetchForeverCharacter } from "@/lib/blizzard";
import { getWowState, setWowState } from "@/lib/workspaceWow";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const current = await getWowState(userId);
    if (!current.characterSlug) {
      return NextResponse.json(
        { error: "Set your character name (name-surname) first." },
        { status: 400 },
      );
    }

    const character = await fetchForeverCharacter(current.characterSlug);
    if (!character) {
      return NextResponse.json(
        { error: `Character “${current.characterSlug}” not found on the Forever armory.` },
        { status: 404 },
      );
    }

    const state = await setWowState(userId, {
      ...current,
      // The armory only refreshes on logout and neither value can drop in game,
      // so a stale armory never overwrites a higher value entered by hand.
      level: Math.max(character.level ?? 0, current.level),
      engineeringSkill: Math.max(character.engineeringSkill ?? 0, current.engineeringSkill),
      equippedRanged: character.equippedRanged ?? current.equippedRanged,
      syncedAt: new Date().toISOString(),
      experience: character.experience ?? current.experience,
      experienceLevel: character.experience !== null && character.level !== null ? character.level : current.experienceLevel,
      guild: character.guild ?? current.guild,
      itemLevel: character.itemLevel ?? current.itemLevel,
      lastLogin: character.lastLogin ?? current.lastLogin,
      petName: character.pet?.name ?? current.petName,
      petFamily: character.pet?.family ?? current.petFamily,
      petLevel: character.pet?.level ?? current.petLevel,
    });

    return NextResponse.json(
      { state, synced: { level: character.level, engineeringSkill: character.engineeringSkill, equippedRanged: character.equippedRanged } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Armory sync failed." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
