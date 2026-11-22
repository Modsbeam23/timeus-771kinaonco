import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const RULE_TEXT = [
  "1. Be respectful. No harassment, discrimination or personal attacks.",
  "2. Share only files and links you are allowed to distribute.",
  "3. No malware, crypto miners, stolen accounts or DRM bypass tools.",
  "4. Credit original creators and clearly label unofficial or work-in-progress releases.",
  "5. No spam, excessive self-promotion or duplicate posts.",
  "6. Keep discussions in the matching channel and use spoiler or warning labels where needed.",
  "7. Follow Discord Terms and BeamNG.drive community rules.",
  "8. Staff decisions are final. Report problems to a Moderator.",
].join("\n");

async function getOrCreateRole(guild, name, options = {}) {
  let role = guild.roles.cache.find((item) =>
    item.name === name || item.name.endsWith(` ${name}`)
  );
  if (!role) {
    role = await guild.roles.create({ name, reason: "ModsL server setup", ...options });
  } else if (role.name !== name) {
    await role.setName(name, "ModsL server decoration").catch(() => null);
  }
  return role;
}

function findRoleByBase(guild, baseName) {
  return guild.roles.cache.find((role) =>
    role.name === baseName || role.name.endsWith(` ${baseName}`)
  );
}

async function getOrCreateCategory(guild, name) {
  const categoryAliases = [
    "INFO",
    "BEAMNG COMMUNITY",
    "MODS & LEAKS",
    "STAFF",
    "VOICE",
  ];
  const alias = categoryAliases.find((item) =>
    name.includes(item) || name.includes(item.replace(/[ &]/g, ""))
  );
  let category = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      (channel.name === name || (alias && channel.name.includes(alias)))
  );
  if (!category) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      reason: "ModsL server setup",
    });
  }
  return category;
}

async function setCategoryPermissions(category, guild, memberRole, unverifiedRole) {
  const everyone = guild.roles.everyone;
  const staffRoles = ["Owner", "Admin", "Moderator"]
    .map((name) => findRoleByBase(guild, name))
    .filter(Boolean);

  const isInfoCategory = category.name.includes("INFO");
  const isStaffCategory = category.name.includes("STAFF");
  const overwrites = [
    {
      id: everyone.id,
      allow: isInfoCategory ? [PermissionFlagsBits.ViewChannel] : [],
      deny: isInfoCategory
        ? [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
        : [PermissionFlagsBits.ViewChannel],
    },
  ];

  if (unverifiedRole) {
    overwrites.push({
      id: unverifiedRole.id,
      allow: isInfoCategory ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] : [],
      deny: isInfoCategory
        ? [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
        : [PermissionFlagsBits.ViewChannel],
    });
  }

  if (memberRole) {
    overwrites.push({
      id: memberRole.id,
      allow: isInfoCategory
        ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
        : isStaffCategory
          ? []
          : [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
      deny: isInfoCategory || isStaffCategory
        ? isStaffCategory
          ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
          : [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
        : [],
    });
  }

  for (const role of staffRoles) {
    overwrites.push({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  await category.permissionOverwrites.set(overwrites);
}

async function getOrCreateTextChannel(guild, category, name, topic = "") {
  let channel = guild.channels.cache.find(
    (item) => item.type === ChannelType.GuildText &&
      (item.name === name || item.name.includes(`・${name}`))
  );
  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: category.id,
      topic,
      reason: "ModsL server setup",
    });
  } else if (channel.parentId !== category.id) {
    await channel.setParent(category.id);
  }
  return channel;
}

async function getOrCreateVoiceChannel(guild, category, name) {
  let channel = guild.channels.cache.find(
    (item) => item.type === ChannelType.GuildVoice &&
      (item.name === name || item.name.includes(`・${name}`))
  );
  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: category.id,
      reason: "ModsL server setup",
    });
  } else if (channel.parentId !== category.id) {
    await channel.setParent(category.id);
  }
  return channel;
}

async function removeDuplicateManagedChannels(guild) {
  const managedNames = new Set([
    "INFO",
    "📋 𝗜𝗡𝗙𝗢",
    "BEAMNG COMMUNITY",
    "🏎️ 𝗕𝗘𝗔𝗠𝗡𝗚 𝗖𝗢𝗠𝗠𝗨𝗡𝗜𝗧𝗬",
    "MODS & LEAKS",
    "📦 𝗠𝗢𝗗𝗦 & 𝗟𝗘𝗔𝗞𝗦",
    "STAFF",
    "🔐 𝗦𝗧𝗔𝗙𝗙",
    "VOICE",
    "🔊 𝗩𝗢𝗜𝗖𝗘",
    "welcome",
    "rules",
    "verification",
    "announcements",
    "roles",
    "server-info",
    "mod-publishing",
    "general",
    "media",
    "support",
    "look-for-people",
    "leaks",
    "leak-request",
    "leak-discussion",
    "mod-showcase",
    "updates",
    "Lobby",
    "Mod Discussion",
    "Mod Testing",
  ]);

  const kept = new Set();
  const channels = [...guild.channels.cache.values()].filter((channel) => {
    const cleanName = channel.name.replace(/^[^・]*・/, "");
    return managedNames.has(channel.name) || managedNames.has(cleanName);
  });

  for (const channel of channels) {
    let cleanName = channel.name.replace(/^[^・]*・/, "");
    if (channel.type === ChannelType.GuildCategory) {
      if (channel.name.includes("INFO")) cleanName = "INFO";
      else if (channel.name.includes("BEAMNG")) cleanName = "BEAMNG COMMUNITY";
      else if (channel.name.includes("MODS")) cleanName = "MODS & LEAKS";
      else if (channel.name.includes("STAFF")) cleanName = "STAFF";
      else if (channel.name.includes("VOICE")) cleanName = "VOICE";
    }
    const key = `${channel.type}:${cleanName}`;
    if (kept.has(key)) {
      await channel.delete("ModsL removed a duplicate setup channel").catch(() => null);
    } else {
      kept.add(key);
    }
  }

  await guild.channels.fetch();
}

async function removeOldBotSetupMessages(guild) {
  const managedTextNames = new Set([
    "welcome",
    "rules",
    "verification",
    "announcements",
    "server-info",
    "roles",
    "mod-publishing",
    "leaks",
    "leak-request",
  ]);

  for (const channel of guild.channels.cache.values()) {
    if (!channel.isTextBased()) continue;
    const cleanName = channel.name.replace(/^[^・]*・/, "");
    if (!managedTextNames.has(cleanName)) continue;
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) continue;
    for (const message of messages.values()) {
      if (message.author.id === guild.client.user.id) {
        await message.delete().catch(() => null);
      }
    }
  }
}

async function removeDuplicateManagedRoles(guild) {
  const roleDefinitions = [
    ["Owner", "👑 Owner"],
    ["Admin", "🛡️ Admin"],
    ["Moderator", "🔨 Moderator"],
    ["Member", "🟢 Member"],
    ["Unverified", "🔒 Unverified"],
    ["Mod Tester", "🧪 Mod Tester"],
    ["Leak Alerts", "🔔 Leak Alerts"],
  ];

  for (const [baseName, decoratedName] of roleDefinitions) {
    const matches = guild.roles.cache
      .filter((role) =>
        role.name === baseName ||
        role.name === decoratedName ||
        role.name.endsWith(` ${baseName}`)
      )
      .sort((a, b) => b.position - a.position);
    if (matches.size < 2) continue;

    const keep = matches.find((role) => role.name === decoratedName) ?? matches.first();
    await keep.setName(decoratedName, "ModsL role cleanup").catch(() => null);
    for (const role of matches.values()) {
      if (role.id !== keep.id) {
        await role.delete("ModsL removed duplicate setup role").catch(() => null);
      }
    }
  }

  await guild.roles.fetch();
}

async function applyServerDecoration(guild) {
  const categoryNames = {
    "📋 𝗜𝗡𝗙𝗢": "📋 𝗜𝗡𝗙𝗢",
    "INFO": "📋 𝗜𝗡𝗙𝗢",
    "🏎️ 𝗕𝗘𝗔𝗠𝗡𝗚 𝗖𝗢𝗠𝗠𝗨𝗡𝗜𝗧𝗬": "🏎️ 𝗕𝗘𝗔𝗠𝗡𝗚 𝗖𝗢𝗠𝗠𝗨𝗡𝗜𝗧𝗬",
    "BEAMNG COMMUNITY": "🏎️ 𝗕𝗘𝗔𝗠𝗡𝗚 𝗖𝗢𝗠𝗠𝗨𝗡𝗜𝗧𝗬",
    "📦 𝗠𝗢𝗗𝗦 & 𝗟𝗘𝗔𝗞𝗦": "📦 𝗠𝗢𝗗𝗦 & 𝗟𝗘𝗔𝗞𝗦",
    "MODS & LEAKS": "📦 𝗠𝗢𝗗𝗦 & 𝗟𝗘𝗔𝗞𝗦",
    "🔐 𝗦𝗧𝗔𝗙𝗙": "🔐 𝗦𝗧𝗔𝗙𝗙",
    "STAFF": "🔐 𝗦𝗧𝗔𝗙𝗙",
    "🔊 𝗩𝗢𝗜𝗖𝗘": "🔊 𝗩𝗢𝗜𝗖𝗘",
    "VOICE": "🔊 𝗩𝗢𝗜𝗖𝗘",
  };
  await guild.channels.fetch();
  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildCategory) continue;
    const decoratedName = categoryNames[channel.name];
    if (decoratedName && channel.name !== decoratedName) {
      await channel.setName(decoratedName, "ModsL server decoration").catch(() => null);
    }
  }

  const channelNames = {
    "welcome": "👋・welcome",
    "rules": "📜・rules",
    "verification": "✅・verification",
    "announcements": "📢・announcements",
    "roles": "🎭・roles",
    "server-info": "ℹ️・server-info",
    "general": "💬・general",
    "media": "🎥・media",
    "support": "🛠️・support",
    "look-for-people": "🤝・look-for-people",
    "leaks": "📦・leaks",
    "leak-request": "📝・leak-request",
    "leak-discussion": "💭・leak-discussion",
    "mod-showcase": "🏁・mod-showcase",
    "updates": "🔄・updates",
    "mod-publishing": "🚀・mod-publishing",
  };

  await guild.channels.fetch();
  for (const channel of guild.channels.cache.values()) {
    if (!channel.isTextBased() && channel.type !== ChannelType.GuildVoice) continue;
    const cleanName = channel.name.replace(/^[^・]*・/, "");
    const decoratedName = channelNames[cleanName];
    if (decoratedName && channel.name !== decoratedName) {
      await channel.setName(decoratedName, "ModsL server decoration").catch(() => null);
    }
  }
}

async function setupServer(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();
  await removeDuplicateManagedChannels(guild);
  await removeOldBotSetupMessages(guild);
  await removeDuplicateManagedRoles(guild);

  const owner = await getOrCreateRole(guild, "👑 Owner", { color: Colors.Red, hoist: true });
  const admin = await getOrCreateRole(guild, "🛡️ Admin", { color: Colors.Orange, hoist: true });
  const moderator = await getOrCreateRole(guild, "🔨 Moderator", { color: Colors.Blue, hoist: true });
  const member = await getOrCreateRole(guild, "🟢 Member", { color: Colors.Green, hoist: false });
  await getOrCreateRole(guild, "🔒 Unverified", { color: Colors.DarkGrey, hoist: false });
  await getOrCreateRole(guild, "🧪 Mod Tester", { color: Colors.Purple, hoist: false });
  await getOrCreateRole(guild, "🔔 Leak Alerts", { color: Colors.Gold, hoist: false });

  const obsoleteMemberRole = guild.roles.cache.find((role) => role.name === "BeamNG Member");
  if (obsoleteMemberRole) {
    await obsoleteMemberRole.delete("ModsL setup removed obsolete role").catch(() => null);
  }

  const info = await getOrCreateCategory(guild, "📋 𝗜𝗡𝗙𝗢");
  const community = await getOrCreateCategory(guild, "🏎️ 𝗕𝗘𝗔𝗠𝗡𝗚 𝗖𝗢𝗠𝗠𝗨𝗡𝗜𝗧𝗬");
  const mods = await getOrCreateCategory(guild, "📦 𝗠𝗢𝗗𝗦 & 𝗟𝗘𝗔𝗞𝗦");
  const staff = await getOrCreateCategory(guild, "🔐 𝗦𝗧𝗔𝗙𝗙");
  const voice = await getOrCreateCategory(guild, "🔊 𝗩𝗢𝗜𝗖𝗘");

  await getOrCreateRole(guild, "🔒 Unverified", { color: Colors.DarkGrey, hoist: false });
  const unverified = findRoleByBase(guild, "Unverified");
  await setCategoryPermissions(info, guild, member, unverified);
  await setCategoryPermissions(community, guild, member, unverified);
  await setCategoryPermissions(mods, guild, member, unverified);
  await setCategoryPermissions(staff, guild, member, unverified);
  await setCategoryPermissions(voice, guild, member, unverified);

  await guild.members.fetch();
  for (const [, guildMember] of guild.members.cache) {
    if (guildMember.user.bot) continue;
    const isStaff = guildMember.id === guild.ownerId
      || guildMember.roles.cache.some((role) =>
        ["Owner", "Admin", "Moderator"].includes(
          role.name.replace(/^(👑|🛡️|🔨)\s*/, "")
        )
      );
    const isVerified = guildMember.roles.cache.has(member.id);
    if (!isStaff && !isVerified && !guildMember.roles.cache.has(unverified.id)) {
      await guildMember.roles.add(unverified).catch(() => null);
    }
  }

  const welcome = await getOrCreateTextChannel(guild, info, "welcome", "Welcome to the ModsL BeamNG community.");
  const rules = await getOrCreateTextChannel(guild, info, "rules", "Community rules.");
  const verification = await getOrCreateTextChannel(guild, info, "verification", "Verify before accessing the server.");
  const announcements = await getOrCreateTextChannel(guild, info, "announcements", "Official ModsL announcements.");
  const rolesChannel = await getOrCreateTextChannel(guild, info, "roles", "Select your community roles.");
  const serverInfo = await getOrCreateTextChannel(guild, info, "server-info", "Server links and useful information.");

  await getOrCreateTextChannel(guild, community, "general", "English discussion for BeamNG.drive.");
  await getOrCreateTextChannel(guild, community, "media", "Screenshots, videos and clips.");
  await getOrCreateTextChannel(guild, community, "support", "Help with installations and troubleshooting.");
  await getOrCreateTextChannel(guild, community, "look-for-people", "Find people for testing or multiplayer.");

  const leakChannel = await getOrCreateTextChannel(guild, mods, "leaks", "Approved mod releases and public links.");
  const leakRequests = await getOrCreateTextChannel(guild, mods, "leak-request", "Request a mod or an authorized release.");
  await getOrCreateTextChannel(guild, mods, "leak-discussion", "Discuss mod releases and quality.");
  await getOrCreateTextChannel(guild, mods, "mod-showcase", "Showcase builds and finished creations.");
  const modUpdates = await getOrCreateTextChannel(guild, mods, "updates", "Updates for mods and this community.");
  const modPublishing = await getOrCreateTextChannel(
    guild,
    staff,
    "mod-publishing",
    "Moderator-only mod publishing panel."
  );

  await leakChannel.permissionOverwrites.edit(guild.roles.everyone, {
    SendMessages: false,
    AddReactions: false,
  }).catch(() => null);
  await leakChannel.permissionOverwrites.edit(member, {
    SendMessages: false,
    AddReactions: false,
  }).catch(() => null);
  await modUpdates.permissionOverwrites.edit(guild.roles.everyone, {
    SendMessages: false,
    AddReactions: false,
  }).catch(() => null);
  await modUpdates.permissionOverwrites.edit(member, {
    SendMessages: false,
    AddReactions: false,
  }).catch(() => null);

  await getOrCreateVoiceChannel(guild, voice, "Lobby");
  await getOrCreateVoiceChannel(guild, voice, "Mod Discussion");
  await getOrCreateVoiceChannel(guild, voice, "Mod Testing");

  await welcome.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("Welcome to ModsL")
        .setDescription("Welcome to our English BeamNG.drive community for mods, authorized leaks, testing and discussion.")
        .setColor(Colors.Blue)
        .addFields(
          { name: "1. Read the rules", value: `Visit ${rules}`, inline: true },
          { name: "2. Choose roles", value: `Visit ${rolesChannel}`, inline: true },
          { name: "3. Explore mods", value: `Visit ${leakChannel}`, inline: true }
        )
        .setFooter({ text: "ModsL" }),
    ],
  });

  await rules.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("ModsL Server Rules")
        .setDescription(RULE_TEXT)
        .setColor(Colors.Red)
        .setFooter({ text: "Respect creators, users and staff." }),
    ],
  });

  await serverInfo.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("ModsL Server Information")
        .setDescription("A community for BeamNG.drive mods and authorized releases.")
        .addFields(
          { name: "Bot owner roles", value: "Owner, Admin, Moderator", inline: false },
          { name: "Posting", value: "Use /submit-mod or the button in the appropriate channel.", inline: false },
          { name: "Requests", value: "Use /request-mod or the button in #leak-request.", inline: false }
        )
        .setColor(Colors.DarkBlue),
    ],
  });

  await verification.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("Server Verification")
        .setDescription("Before gaining access, verify that you agree to the ModsL server rules.")
        .setColor(Colors.Green),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("modsl_verify")
          .setLabel("Verify")
          .setStyle(ButtonStyle.Success)
      ),
    ],
  });

  const roleEmbed = new EmbedBuilder()
    .setTitle("Choose your ModsL roles")
    .setDescription("Use the buttons below to add or remove a role.")
    .setColor(Colors.Green);

  await rolesChannel.send({
    embeds: [roleEmbed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("role_tester").setLabel("Mod Tester").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("role_alert").setLabel("Leak Alerts").setStyle(ButtonStyle.Danger)
      ),
    ],
  });

  await leakChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("BeamNG Mods & Leaks")
        .setDescription("Approved mod releases and public links are published here by staff.")
        .setColor(Colors.Orange),
    ],
  });

  await modPublishing.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("Publish a mod")
        .setDescription("This panel is available to Owner, Admin and Moderator roles. Submitted mods appear in #leaks.")
        .setColor(Colors.Orange),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("modsl_submit")
          .setLabel("Submit Mod")
          .setStyle(ButtonStyle.Primary)
      ),
    ],
  });

  await leakRequests.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("Mod request")
        .setDescription("Do not request pirated or bypass-only content. Describe the mod you need and use the button or `/request-mod`.")
        .setColor(Colors.Yellow),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("modsl_request").setLabel("Request Mod").setStyle(ButtonStyle.Secondary)
      ),
    ],
  });

  await applyServerDecoration(guild);

  return {
    owner,
    admin,
    moderator,
    welcome,
    rules,
    announcements,
    rolesChannel,
    leakChannel,
  };
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
  return interaction.member.roles.cache.some((role) =>
    ["Owner", "Admin", "Moderator"].includes(
      role.name.replace(/^(👑|🛡️|🔨)\s*/, "")
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

  const target = findChannel(interaction.guild, "leaks") ?? interaction.channel;
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

  await target.send({ embeds: [embed] });
  await interaction.reply({
    content: `Mod submitted to ${target}.`,
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

client.on("guildMemberAdd", async (guildMember) => {
  if (guildMember.user.bot) return;
  const unverified = findRoleByBase(guildMember.guild, "Unverified");
  if (unverified) {
    await guildMember.roles.add(unverified).catch((error) => console.error(error));
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-server") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const result = await setupServer(interaction.guild);
        await interaction.editReply({
          content: `Server setup complete. Created or updated ModsL categories, roles, channels and voice channels. Owner/Admin/Moderator roles: ${result.owner.name}, ${result.admin.name}, ${result.moderator.name}.`,
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
          await interaction.reply({ content: "Run /setup-server first.", flags: MessageFlags.Ephemeral });
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
      if (interaction.customId === "modsl_verify") {
        const memberRole = findRoleByBase(interaction.guild, "Member");
        const unverifiedRole = findRoleByBase(interaction.guild, "Unverified");
        if (!memberRole || !unverifiedRole) {
          await interaction.reply({ content: "Run /setup-server first.", flags: MessageFlags.Ephemeral });
          return;
        }

        if (interaction.member.roles.cache.has(memberRole.id)) {
          await interaction.reply({ content: "You are already verified.", flags: MessageFlags.Ephemeral });
          return;
        }

        await interaction.member.roles.remove(unverifiedRole).catch(() => null);
        await interaction.member.roles.add(memberRole);
        await interaction.reply({
          content: "Verification complete. You now have access to the community channels.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

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

      if (interaction.customId.startsWith("role_")) {
        const memberRole = findRoleByBase(interaction.guild, "Member");
        if (!memberRole || !interaction.member.roles.cache.has(memberRole.id)) {
          await interaction.reply({
            content: "Complete verification before choosing optional roles.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const roleName =
          interaction.customId === "role_tester" ? "Mod Tester" : "Leak Alerts";
        const role = findRoleByBase(interaction.guild, roleName);
        if (!role) {
          await interaction.reply({ content: "Run /setup-server first.", flags: MessageFlags.Ephemeral });
          return;
        }
        if (interaction.member.roles.cache.has(role.id)) {
          await interaction.member.roles.remove(role);
          await interaction.reply({ content: `${roleName} role removed.`, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.member.roles.add(role);
          await interaction.reply({ content: `${roleName} role added.`, flags: MessageFlags.Ephemeral });
        }
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
