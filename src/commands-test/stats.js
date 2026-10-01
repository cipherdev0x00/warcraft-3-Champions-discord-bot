const { getPlayerByName, participatedInSeason } = require("../services");
const {
  playerByName,
  atGamemodesEmbed,
  RestGamemodesEmbed,
} = require("../libs/embed");
const { OneVOneEmbed } = require("../libs/embed");
const { findStatsAndGamemode } = require("../libs/showStats");
const { SlashCommandBuilder } = require("discord.js");
const { ActionRowBuilder } = require("discord.js");
const { StringSelectMenuBuilder } = require("discord.js");
const {
  GAMEMODES,
  ONE_V_ONE_GAMEMODE_NAME,
  ONE_V_ONE_GAMEMODE,
  TWO_V_TWO_GAMEMODE_NAME,
  TWO_V_TWO_GAMEMODE,
  FOUR_V_FOUR_GAMEMODE_NAME,
  FOUR_V_FOUR_GAMEMODE,
  ONE_V_ONE_ROC_GAMEMODE_NAME,
  ONE_V_ONE_ROC_GAMEMODE,
  ONE_V_ONE_LEGION_TD_NAME,
  ONE_V_ONE_LEGION_TD,
  FOUR_V_FOUR_LEGION_TD_NAME,
  FOUR_V_FOUR_LEGION_TD,
  MINIDOTA_GAMEMODE_NAME,
  MINIDOTA_GAMEMODE,
  MINIDOTA_AT_GAMEMODE_NAME,
  MINIDOTA_AT_GAMEMODE,
  FOUR_V_FOUR_AT_GAMEMODE,
  FOUR_V_FOUR_AT_GAMEMODE_NAME,
  DIRECT_STRIKE_GAMEMODE_NAME,
  DIRECT_STRIKE_GAMEMODE,
} = require("../libs/helper");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Shows player profile stats")
    .addStringOption((option) =>
      option
        .setName("battletag")
        .setDescription("The player's battletag")
        .setAutocomplete(true)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("gamemode")
        .setDescription("The game mode")
        .setRequired(false)
        .addChoices(
          { name: ONE_V_ONE_GAMEMODE_NAME, value: ONE_V_ONE_GAMEMODE },
          { name: TWO_V_TWO_GAMEMODE_NAME, value: TWO_V_TWO_GAMEMODE },
          { name: FOUR_V_FOUR_GAMEMODE_NAME, value: FOUR_V_FOUR_GAMEMODE },
          {
            name: FOUR_V_FOUR_AT_GAMEMODE_NAME,
            value: FOUR_V_FOUR_AT_GAMEMODE,
          },
          { name: ONE_V_ONE_ROC_GAMEMODE_NAME, value: ONE_V_ONE_ROC_GAMEMODE },
          { name: ONE_V_ONE_LEGION_TD_NAME, value: ONE_V_ONE_LEGION_TD },
          { name: FOUR_V_FOUR_LEGION_TD_NAME, value: FOUR_V_FOUR_LEGION_TD },
          { name: MINIDOTA_GAMEMODE_NAME, value: MINIDOTA_GAMEMODE },
          { name: MINIDOTA_AT_GAMEMODE_NAME, value: MINIDOTA_AT_GAMEMODE },
          { name: DIRECT_STRIKE_GAMEMODE_NAME, value: DIRECT_STRIKE_GAMEMODE },
        ),
    ),

  async execute(interaction, battleTag, gameModeSelected, seasonSelected) {
    try {
      let player = interaction?.options?.getString("battletag") || battleTag;
      const gameMode =
        interaction?.options?.getString("gamemode") ||
        gameModeSelected ||
        ONE_V_ONE_GAMEMODE;
      let indexLeague = 2;

      const { stats, gameModeWithoutDuplicate: gameModes } =
        await findStatsAndGamemode(player, gameMode, seasonSelected);
      let embed = null;

      if (stats.length === 0) {
        return interaction.reply({
          content: `No stats found for ${player} in ${GAMEMODES[gameMode.toString()]} mode.`,
          ephemeral: true,
        });
      }

      if (gameMode === ONE_V_ONE_GAMEMODE) {
        embed = await OneVOneEmbed(player, stats, indexLeague);
      } else if (
        [FOUR_V_FOUR_AT_GAMEMODE, MINIDOTA_AT_GAMEMODE].includes(gameMode)
      ) {
        embed = await atGamemodesEmbed(player, stats, indexLeague);
      } else {
        embed = await RestGamemodesEmbed(player, stats, indexLeague);
      }
      let seasons = await participatedInSeason(player);

      if (seasons.length > 25) {
        seasons = seasons.slice(0, 25);
      }

      const selectorMode = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`stats_mode_${player}`)
          .setPlaceholder(GAMEMODES[gameMode.toString()])
          .addOptions(
            gameModes.map((mode) => ({
              label: GAMEMODES[mode.gameMode.toString()],
              value: `${mode.gameMode.toString()}_${crypto.randomUUID()}`,
            })),
          ),
      );

      // const selectorSeason = new ActionRowBuilder().addComponents(
      //   new StringSelectMenuBuilder()
      //     .setCustomId(`season_${player}_${gameModeSelected}`)
      //     .setPlaceholder(`Season ${process.env.SEASON}`)
      //     .addOptions(
      //       seasons.map((season) => ({
      //         label: season.id.toString(),
      //         value: `season_${season.id}_${crypto.randomUUID()}`,
      //       }))
      //     )
      // );

      if (gameModes.length === 0) {
        return interaction.reply({
          embeds: [embed],
        });
      }
      return interaction.reply({
        embeds: [embed],
        components: [selectorMode],
      });
    } catch (err) {
      console.log(err);
    }
  },
};
