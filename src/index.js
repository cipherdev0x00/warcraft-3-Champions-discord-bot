const express = require("express");
const { findW3CPlayer } = require("./services");
const {
  ANY_HERO,
  NO_HERO,
  resolveHero,
  searchHeroes,
} = require("./libs/heroes");
const {
  PICK_PREVIOUS_FIRST,
  isEmptySlot,
} = require("./libs/lineup");

const ALLY_OPTIONS = ["hero1", "hero2", "hero3"];
const ENEMY_OPTIONS = ["enemy1", "enemy2", "enemy3"];
const LINEUPS = [ALLY_OPTIONS, ENEMY_OPTIONS];

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

const app = express();

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(3000, () => {
  console.log("server on port 3000");
});

const { config } = require("dotenv");

config();

const {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  Partials,
  REST,
  Routes,
} = require("discord.js");
const eventsMessage = require("./events/message");
const fs = require("fs");
const path = require("path");
const { EUROPE_SERVER } = require("./libs/helper");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.User,
    Partials.Message,
    Partials.GuildMember,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands-test");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `The Command ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

async function deployCommands() {
  const commands = [];

  const commandFiles = fs
    .readdirSync(path.join(__dirname, "commands-test"))
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(`./commands-test/${file}`);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(
        `WARNING: The command at ${file} is missing a required 'data' or 'execute' property.`
      );
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  console.log(`Started refreshing application slash commands globally.`);
  const data = await rest.put(
    Routes.applicationCommands("751448461877968960"),
    { body: commands }
  );
}

client.on(Events.ClientReady, async () => {
  client.user.setActivity("!help");
  await deployCommands();
  console.log("bot is ready!!!!!!!!!");
});

client.on(Events.InteractionCreate, async (interaction) => {

    if (interaction.isAutocomplete() && interaction.commandName === "herostats") {
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
      return;
    }
  }

  if (
    (interaction.commandName === "stats" ||
      interaction.commandName === "score") &&
    interaction.isAutocomplete()
  ) {
    const focusedValue = interaction.options.getFocused();

    if (focusedValue.length < 3) {
      return await interaction.respond([]);
    }

    try {
      const players = await findW3CPlayer(focusedValue, EUROPE_SERVER);
      const choices = players
        .map((player) => {
          return {
            name: player.battleTag,
            value: player.battleTag,
          };
        })
        .slice(0, 25);

      await interaction.respond(choices);
    } catch (error) {
      console.log(error);
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith("stats_mode_")) {
      const [unkwon, unkwn2, player] = interaction.customId.split("_");

      const [gameModeSelected] = interaction.values[0].split("_");

      const statsCommand = client.commands.get("stats");

      statsCommand.execute(interaction, player, gameModeSelected);
      return;
    }

    if (interaction.customId.startsWith("details")) {
      const matchSelected = interaction.values[0];
      const detailsCommand = client.commands.get("details");

      detailsCommand.execute(interaction, matchSelected);
      return;
    }
  }
});

eventsMessage(client);
client.login(process.env.DISCORD_TOKEN);
