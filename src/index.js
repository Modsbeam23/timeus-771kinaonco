import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionFlagsBits,
  Colors,
  MessageFlags,
} from "discord.js";

import {
  submitModModal,
  requestModModal,
} from "./commands.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

async function setupBotRole(guild) {
  await guild.roles.fetch();
  const permissions = [
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
  ];

  let role = guild.roles.cache.find((item) => item.name === "🤖 ModsL Bot");
  if (!role) {
    role = await guild.roles.create({
      name: "🤖 ModsL Bot",
      color: Colors.DarkBlue,
      hoist: true,
      permissions,
      reason: "ModsL bot role setup",
    });
  } else {
    await role.edit(
      { color: Colors.DarkBlue, hoist: true, permissions },
      "ModsL bot role setup"
    );
  }

  const botMember = await guild.members.fetch(guild.client.user.id);
  if (!botMember.roles.cache.has(role.id)) {
    await botMember.roles.add(role, "Assign ModsL bot role");
  }

  return role;
}

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function findChannel(guild, name) {
  return guild.channels.cache.find(
    (channel) =>
      channel.isTextBased() &&
      (channel.name === name || channel.name.includes(`・${name}`))
  );
}

function isStaffMember(interaction) {
  if (interaction.guild.ownerId === interaction.member.id) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  return interaction.member.roles.cache.some((role) =>
    ["Owner", "Admin", "Moderator"].includes(
      role.name.replace(/^(👑|🛡️|🔨)\s*/, "").trim()
    )
  );
}

async function publishMod(interaction, name, link, description, imageUrl = null) {
  if (!isStaffMember(interaction)) {
    await interaction.reply({
      content: "Only Owner, Admin and Moderator roles can submit mods to #leaks.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (!validHttpUrl(link)) {
    await interaction.reply({ content: "Please provide a valid http:// or https:// link.", flags: MessageFlags.Ephemeral });
    return;
  }

  const configuredChannelId = process.env.AUTO_CHANNEL_ID?.trim();
  const configuredChannel = configuredChannelId
    ? interaction.guild.channels.cache.get(configuredChannelId)
    : null;
  if (configuredChannel && !configuredChannel.isTextBased()) {
    await interaction.reply({
      content: "AUTO_CHANNEL_ID does not point to a text channel in this server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const target =
    configuredChannel ??
    findChannel(interaction.guild, "auta") ??
    findChannel(interaction.guild, "leaks") ??
    interaction.channel;
  const embed = new EmbedBuilder()
    .setTitle(name)
    .setDescription(description || "New BeamNG.drive mod submission.")
    .setURL(link)
    .setColor(Colors.Orange)
    .addFields(
      { name: "Download / source", value: link, inline: false },
      { name: "Submitted by", value: `${interaction.user}`, inline: true }
    )
    .setTimestamp();

  if (imageUrl && validHttpUrl(imageUrl)) {
    embed.setImage(imageUrl);
  }

  const publishedMessage = await target.send({ embeds: [embed] });
  const botMember = await interaction.guild.members.fetchMe();
  const channelPermissions = target.permissionsFor(botMember);
  if (!channelPermissions?.has(PermissionFlagsBits.AddReactions)) {
    console.warn(`ModsL lacks Add Reactions permission in channel ${target.id}.`);
    await interaction.reply({
      content: `Mod posted to ${target}, but I cannot add reactions there. Give the bot role the **Add Reactions** permission in that channel.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await publishedMessage.react("❤️");
    await publishedMessage.react("👎");
  } catch (error) {
    console.error(`ModsL failed to react to mod post ${publishedMessage.id}:`, error);
    await interaction.reply({
      content: `Mod posted to ${target}, but Discord rejected my reactions. Check the bot role's **Add Reactions** permission in that channel.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: `Mod submitted to ${target} with ❤️ and 👎 reactions.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function publishRequest(interaction, name, details) {
  const target = findChannel(interaction.guild, "leak-request") ?? interaction.channel;
  const embed = new EmbedBuilder()
    .setTitle(`Request: ${name}`)
    .setDescription(details || "No additional details provided.")
    .setColor(Colors.Yellow)
    .addFields({ name: "Requested by", value: `${interaction.user}`, inline: true })
    .setTimestamp();

  await target.send({ embeds: [embed] });
  await interaction.reply({
    content: `Request posted in ${target}.`,
    flags: MessageFlags.Ephemeral,
  });
}

client.once("clientReady", () => {
  console.log(`ModsL is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-bot-role") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const role = await setupBotRole(interaction.guild);
        await interaction.editReply({
          content: `Created and assigned ${role} to ModsL. No server channels or community roles were changed.`,
        });
      }

      if (interaction.commandName === "submit-mod") {
        const image = interaction.options.getAttachment("image");
        const imageUrl =
          image && (!image.contentType || image.contentType.startsWith("image/"))
            ? image.url
            : null;
        await publishMod(
          interaction,
          interaction.options.getString("name", true),
          interaction.options.getString("link", true),
          interaction.options.getString("description") ?? "",
          imageUrl
        );
      }

      if (interaction.commandName === "request-mod") {
        await publishRequest(
          interaction,
          interaction.options.getString("name", true),
          interaction.options.getString("details") ?? ""
        );
      }

      if (interaction.commandName === "announce") {
        const channel = findChannel(interaction.guild, "announcements");
        if (!channel) {
          await interaction.reply({ content: "There is no #announcements channel on this server.", flags: MessageFlags.Ephemeral });
          return;
        }
        const embed = new EmbedBuilder()
          .setTitle(interaction.options.getString("title", true))
          .setDescription(interaction.options.getString("message", true))
          .setColor(Colors.Red)
          .setAuthor({ name: "ModsL Announcement" })
          .setTimestamp();
        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `Announcement sent to ${channel}.`, flags: MessageFlags.Ephemeral });
      }

      if (interaction.commandName === "health") {
        await interaction.reply({ content: "ModsL is online.", flags: MessageFlags.Ephemeral });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "modsl_submit") {
        if (!isStaffMember(interaction)) {
          await interaction.reply({
            content: "Only Owner, Admin and Moderator roles can submit mods.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await interaction.showModal(submitModModal());
      }
      if (interaction.customId === "modsl_request") {
        await interaction.showModal(requestModModal());
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "modsl_submit_modal") {
        await publishMod(
          interaction,
          interaction.fields.getTextInputValue("mod_name"),
          interaction.fields.getTextInputValue("mod_link"),
          interaction.fields.getTextInputValue("mod_description"),
          interaction.fields.getTextInputValue("mod_image") || null
        );
      }
      if (interaction.customId === "modsl_request_modal") {
        await publishRequest(
          interaction,
          interaction.fields.getTextInputValue("request_name"),
          interaction.fields.getTextInputValue("request_details")
        );
      }
    }
  } catch (error) {
    console.error(error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "An unexpected error occurred.", flags: MessageFlags.Ephemeral }).catch(() => {});
    } else if (interaction.isRepliable()) {
      await interaction.followUp({ content: "An unexpected error occurred.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.");
}

client.login(token);
