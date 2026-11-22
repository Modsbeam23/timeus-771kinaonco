import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("setup-server")
    .setDescription("Create ModsL roles, categories, channels, rules and voice channels")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("submit-mod")
    .setDescription("Submit a BeamNG mod or leak link")
    .addStringOption((option) =>
      option.setName("name").setDescription("Mod name").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("link").setDescription("Public download or source link").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("description").setDescription("Short description").setRequired(false)
    )
    .addAttachmentOption((option) =>
      option.setName("image").setDescription("Mod preview image").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("request-mod")
    .setDescription("Request a specific BeamNG mod")
    .addStringOption((option) =>
      option.setName("name").setDescription("Mod or vehicle name").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("details").setDescription("Additional details").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send an announcement as ModsL")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) =>
      option.setName("title").setDescription("Announcement title").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("message").setDescription("Announcement text").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("health")
    .setDescription("Check whether ModsL is online"),
];

export function submitModModal() {
  const modal = new ModalBuilder()
    .setCustomId("modsl_submit_modal")
    .setTitle("Submit a BeamNG Mod");

  const name = new TextInputBuilder()
    .setCustomId("mod_name")
    .setLabel("Mod name")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);
  const link = new TextInputBuilder()
    .setCustomId("mod_link")
    .setLabel("Download or source URL")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  const description = new TextInputBuilder()
    .setCustomId("mod_description")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(false);
  const imageUrl = new TextInputBuilder()
    .setCustomId("mod_image")
    .setLabel("Preview image URL")
    .setPlaceholder("https://example.com/mod-preview.jpg")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  return modal.addComponents(
    new ActionRowBuilder().addComponents(name),
    new ActionRowBuilder().addComponents(link),
    new ActionRowBuilder().addComponents(description),
    new ActionRowBuilder().addComponents(imageUrl)
  );
}

export function requestModModal() {
  const modal = new ModalBuilder()
    .setCustomId("modsl_request_modal")
    .setTitle("Request a BeamNG Mod");

  const name = new TextInputBuilder()
    .setCustomId("request_name")
    .setLabel("Mod or vehicle name")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);
  const details = new TextInputBuilder()
    .setCustomId("request_details")
    .setLabel("Details / budget / source")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(false);

  return modal.addComponents(
    new ActionRowBuilder().addComponents(name),
    new ActionRowBuilder().addComponents(details)
  );
}
