import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildIds = [
  ...(process.env.GUILD_IDS ?? "").split(","),
  process.env.GUILD_ID ?? "",
]
  .map((id) => id.trim())
  .filter(Boolean);

if (!token || !clientId) {
  throw new Error("DISCORD_TOKEN and CLIENT_ID must be set in .env");
}

const rest = new REST({ version: "10" }).setToken(token);
const body = commands.map((command) => command.toJSON());

if (guildIds.length > 0) {
  const uniqueGuildIds = [...new Set(guildIds)];
  for (const guildId of uniqueGuildIds) {
    if (!/^\d{17,20}$/.test(guildId)) {
      throw new Error(`Invalid Discord guild ID: ${guildId}`);
    }
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log(`Registered slash commands in guild ${guildId}.`);
  }
} else {
  await rest.put(Routes.applicationCommands(clientId), { body });
  console.log("Registered global slash commands. Global commands may take up to one hour.");
}
