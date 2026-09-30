const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getStatsHeros } = require("../services");
const canvasHeroesStats = require("../libs/canvas/canvasHeroesStats");
const {
  ANY_HERO,
  NO_HERO,
  resolveHero,
  searchHeroes,
  toApiId,
} = require("../libs/heroes");
const {
  buildLineup,
  isEmptySlot,
  PICK_PREVIOUS_FIRST,
} = require("../libs/lineup");

const ALLY_OPTIONS = ["hero1", "hero2", "hero3"];
const ENEMY_OPTIONS = ["enemy1", "enemy2", "enemy3"];
const LINEUPS = [ALLY_OPTIONS, ENEMY_OPTIONS];

const data = new SlashCommandBuilder()
  .setName("herostats")
  .setDescription("Shows the winrate of a hero lineup against another lineup");
[
  ...ALLY_OPTIONS.map((name, i) => ({
    name,
    description: `Hero #${i + 1} of your lineup`,
    required: i === 0,
  })),
  ...ENEMY_OPTIONS.map((name, i) => ({
    name,
    description: `Hero #${i + 1} of the opposing lineup`,
    required: false,
  })),
].forEach(({ name, description, required }) => {
  data.addStringOption((option) =>
    option
      .setName(name)
      .setDescription(description)
      .setAutocomplete(true)
      .setRequired(required)
  );
});

const choiceLabel = (hero) =>
  hero.race === ANY_HERO.race || hero.race === NO_HERO.race
    ? hero.name
    : `${hero.name} (${hero.race})`;

const toChoice = (hero) => ({ name: choiceLabel(hero), value: hero.key });

// Current value of an option, or null when it is empty.
const readSlot = (interaction, name) => {
  const value = interaction.options.getString(name);
  return isEmptySlot(value) ? null : value;
};

module.exports = {
  data,

  async autocomplete(interaction) {
    try {
      const focused = interaction.options.getFocused(true);
      const lineup = LINEUPS.find((names) => names.includes(focused.name));
      if (!lineup) return await interaction.respond([]);

      const position = lineup.indexOf(focused.name);
      const earlier = lineup
        .slice(0, position)
        .map((name) => readSlot(interaction, name));

      // Slots must be filled in order, so hint at the one that is missing.
      const missing = earlier.indexOf(null);
      if (missing !== -1) {
        return await interaction.respond([
          { name: `Pick ${lineup[missing]} first`, value: PICK_PREVIOUS_FIRST },
        ]);
      }

      // After a "No hero" slot the only possible value is "No hero" again.
      if (earlier.some((value) => resolveHero(value) === NO_HERO)) {
        return await interaction.respond([toChoice(NO_HERO)]);
      }

      // A hero cannot be picked twice in the same lineup.
      const alreadyPicked = lineup
        .filter((name) => name !== focused.name)
        .map((name) => readSlot(interaction, name))
        .map((value) => (value === null ? null : resolveHero(value)))
        .filter(Boolean)
        .map((hero) => hero.key);

      const choices = searchHeroes(focused.value, {
        exclude: alreadyPicked,
        allowNone: position > 0,
      }).map(toChoice);

      await interaction.respond(choices);
    } catch (error) {
      console.log(error);
    }
  },

  async execute(interaction) {
    const allies = buildLineup(
      ALLY_OPTIONS,
      ALLY_OPTIONS.map((name) => interaction.options.getString(name))
    );
    const enemies = buildLineup(
      ENEMY_OPTIONS,
      ENEMY_OPTIONS.map((name) => interaction.options.getString(name))
    );

    const errors = [...allies.errors, ...enemies.errors];
    if (errors.length > 0) {
      return interaction.reply({
        content: errors.map((error) => `• ${error}`).join("\n"),
        flags: MessageFlags.Ephemeral,
      });
    }

    // The API call and the canvas render can take longer than Discord's
    // 3 second window, so acknowledge the interaction first.
    await interaction.deferReply();

    try {
      const [ally1, ally2, ally3] = allies.heroes;
      const [enemy1, enemy2, enemy3] = enemies.heroes;

      const stats = await getStatsHeros(
        toApiId(ally1),
        toApiId(ally2),
        toApiId(ally3),
        toApiId(enemy1),
        toApiId(enemy2),
        toApiId(enemy3)
      );

      const totalGames = (stats?.wins ?? 0) + (stats?.losses ?? 0);
      if (!stats || totalGames === 0) {
        return interaction.editReply("stats not found");
      }

      const image = canvasHeroesStats(
        [ally1.key, ally2.key, ally3.key],
        [enemy1.key, enemy2.key, enemy3.key],
        stats
      );

      return interaction.editReply({ files: [image] });
    } catch (error) {
      console.log(error);
      return interaction.editReply("Something went wrong while loading the stats.");
    }
  },
};