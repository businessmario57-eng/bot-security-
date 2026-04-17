require("dotenv").config();

const fs = require("fs");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState
} = require("@discordjs/voice");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =======================
// ⚙️ CONFIG
// =======================
const PREFIX = "b";

const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

const PANEL_CHANNEL_ID = "1494735880760328444";
const ROLE_GENTLEMAN = "1488390481908863067";
const PANEL_MESSAGE_FILE = "./panel.json";

let connection;

// =======================
// 🔥 JOIN VC
// =======================
async function connectToVC() {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    connection = joinVoiceChannel({
      channelId: VOICE_CHANNEL_ID,
      guildId: GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfMute: false,
      selfDeaf: false
    });

    console.log("✅ Bot masuk voice");

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch {
        console.log("🔄 Reconnecting VC...");
        connectToVC();
      }
    });

  } catch (err) {
    console.log("❌ Error:", err);
    setTimeout(connectToVC, 5000);
  }
}

// =======================
// 📦 PANEL SYSTEM
// =======================
async function sendOrUpdatePanel() {
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return console.log("❌ Channel panel tidak ditemukan");

  let data = {};
  if (fs.existsSync(PANEL_MESSAGE_FILE)) {
    data = JSON.parse(fs.readFileSync(PANEL_MESSAGE_FILE));
  }

  const embed = new EmbedBuilder()
    .setColor(0xff69b4)
    .setTitle("Gender Catalog")
    .setDescription(
`Silahkan pilih roles sesuai dengan gender kamu. Untuk role Ladies silahkan contact ADMIN untuk melakukan verifikasi.

🚹┃ **Boy's**
Langsung pilih melalui dropdown.

🌸┃ **Girl's**
Harus melalui verifikasi (Join Voice).`
    )
    .setImage("https://media.discordapp.net/attachments/1487590787284734143/1494745021381873835/Black_and_Silver_Star_Dust_Love_Facebook_Cover_1.png");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("gender_select")
    .setPlaceholder("Click menu ini untuk memilih roles!")
    .addOptions([
      {
        label: "Boy's",
        value: "Boy's",
        emoji: "🚹"
      }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  if (data.messageId) {
    try {
      const oldMsg = await channel.messages.fetch(data.messageId);

      await oldMsg.edit({
        embeds: [embed],
        components: [row]
      });

      console.log("♻️ Panel di-update");
      return;
    } catch {
      console.log("⚠️ Panel hilang, kirim ulang");
    }
  }

  const msg = await channel.send({
    embeds: [embed],
    components: [row]
  });

  fs.writeFileSync(PANEL_MESSAGE_FILE, JSON.stringify({
    messageId: msg.id
  }));

  console.log("✅ Panel dikirim");
}

// =======================
// 🚀 READY
// =======================
client.on("ready", async () => {
  console.log(`🔥 Login sebagai ${client.user.tag}`);
  connectToVC();
  await sendOrUpdatePanel();
});

// =======================
// 🧹 AUTO CLEAN CHANNEL
// =======================
client.on("messageCreate", async (msg) => {
  if (msg.channel.id === PANEL_CHANNEL_ID && !msg.author.bot) {
    if (msg.deletable) {
      await msg.delete().catch(() => {});
    }
  }
});

// =======================
// 🎯 SELECT MENU
// =======================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "gender_select") {
    const member = interaction.member;
    const roleGent = interaction.guild.roles.cache.get(ROLE_GENTLEMAN);

    if (interaction.values[0] === "gentleman") {

      if (member.roles.cache.has(ROLE_GENTLEMAN)) {
        return interaction.reply({
          content: "⚠️ Kamu sudah punya role ini",
          ephemeral: true
        });
      }

      await member.roles.add(roleGent);

      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle("Role Updated")
        .setDescription(`✅Added role:\n<@&${ROLE_GENTLEMAN}>`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "BETLEHEM • Role System" })
        .setTimestamp();

      console.log(`🚹 ${interaction.user.tag} pilih Gentleman`);

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
});

// =======================
// 🎮 COMMAND BASIC
// =======================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const cmd = msg.content.slice(PREFIX.length).trim().toLowerCase();

  if (cmd === "ping") {
    msg.reply("🏓 Pong!");
  }

  if (cmd === "join") {
    connectToVC();
    msg.reply("✅ Masuk VC!");
  }

  if (cmd === "leave") {
    const conn = getVoiceConnection(GUILD_ID);
    if (conn) {
      conn.destroy();
      msg.reply("👋 Keluar VC!");
    }
  }
});

// =======================
// 🔐 LOGIN
// =======================
client.login(process.env.TOKEN);
