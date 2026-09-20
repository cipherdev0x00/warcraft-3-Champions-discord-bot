const { ANY_HERO, NO_HERO, resolveHero } = require("./heroes");

// Value of the hint entry shown in the autocomplete list when the previous slot
// is still empty. If the user picks it anyway, it is treated as an empty slot.
const PICK_PREVIOUS_FIRST = "__pick_previous_first__";

const isEmptySlot = (value) =>
  value === null ||
  value === undefined ||
  value === "" ||
  value === PICK_PREVIOUS_FIRST;

/**
 * Validates and resolves one lineup (the allies or the enemies).
 *
 * Rules:
 *  1. Slots must be filled in order: slot 2 needs slot 1, slot 3 needs slot 2.
 *  2. Every value must be a known hero (or "Any hero" / "No hero").
 *  3. "No hero" is not allowed in slot 1 (a lineup needs at least one hero).
 *  4. After a "No hero" slot, later slots can only be empty or "No hero".
 *  5. The same hero cannot appear twice in one lineup.
 *
 * Empty slots default to "Any hero", except after a "No hero" slot, where they
 * become "No hero" too (there cannot be a 3rd hero without a 2nd one).
 *
 * @param {string[]} slotNames option names, in order (used in error messages)
 * @param {(string|null)[]} rawValues raw values typed/selected by the user
 * @returns {{ heroes: object[], errors: string[] }}
 */
function buildLineup(slotNames, rawValues) {
  const heroes = [];
  const errors = [];
  const usedKeys = new Set();
  let firstEmptyIndex = -1;
  let gapReported = false;
  let seenNoHero = false;

  for (let i = 0; i < slotNames.length; i++) {
    const name = slotNames[i];
    const raw = rawValues[i];

    if (isEmptySlot(raw)) {
      heroes.push(seenNoHero ? NO_HERO : ANY_HERO);
      if (firstEmptyIndex === -1) firstEmptyIndex = i;
      continue;
    }

    if (firstEmptyIndex !== -1) {
      // One message per lineup is enough, later slots point to the same gap.
      if (!gapReported) {
        errors.push(`Pick ${slotNames[firstEmptyIndex]} before ${name}.`);
        gapReported = true;
      }
      heroes.push(ANY_HERO);
      continue;
    }

    const hero = resolveHero(raw);
    if (!hero) {
      errors.push(`"${raw}" (${name}) is not a known hero. Pick one from the autocomplete list.`);
      heroes.push(ANY_HERO);
      continue;
    }

    if (hero === NO_HERO) {
      if (i === 0) {
        errors.push(`${name} cannot be "${NO_HERO.name}": a lineup needs at least one hero.`);
      }
      seenNoHero = true;
      heroes.push(NO_HERO);
      continue;
    }

    if (seenNoHero) {
      errors.push(`${name} must be empty or "${NO_HERO.name}" because an earlier slot is "${NO_HERO.name}".`);
      heroes.push(NO_HERO);
      continue;
    }

    if (hero !== ANY_HERO) {
      if (usedKeys.has(hero.key)) {
        errors.push(`${hero.name} is picked twice in the same lineup (${name}).`);
      }
      usedKeys.add(hero.key);
    }
    heroes.push(hero);
  }

  return { heroes, errors };
}

module.exports = { buildLineup, isEmptySlot, PICK_PREVIOUS_FIRST };