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
  VoiceConnectionStatus
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

const PANEL_CHANNEL_ID = "1488135944371572866";
const ROLE_GENTLEMAN = "1488390481908863067";
const ROLE_LADIES = "1488390217940336701";
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
      console.log("⚠️ Disconnect, reconnecting...");
      setTimeout(connectToVC, 3000);
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
    .setColor(0x2b2d31)
    .setTitle("Gender Catalog")
    .setDescription(
`Silahkan pilih roles sesuai dengan gender kamu.

💜 **Female Verification**
Hubungi Guardian untuk akses.

👔 Gentleman
🌸 Ladies (VC & Cam)`
    )
    .setImage("https://i.imgur.com/yourImage.png");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("gender_select")
    .setPlaceholder("Click menu ini untuk memilih roles!")
    .addOptions([
      {
        label: "Gentleman",
        value: "gentleman",
        emoji: "👔"
      },
      {
        label: "Ladies",
        value: "ladies",
        emoji: "🌸"
      }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  // 🔍 cek message lama
  if (data.messageId) {
    try {
      const oldMsg = await channel.messages.fetch(data.messageId);

      await oldMsg.edit({
        embeds: [embed],
        components: [row]
      });

      console.log("♻️ Panel di-update (bukan kirim baru)");
      return;
    } catch {
      console.log("⚠️ Panel lama hilang, kirim ulang");
    }
  }

  // 🚀 kirim baru
  const msg = await channel.send({
    embeds: [embed],
    components: [row]
  });

  fs.writeFileSync(PANEL_MESSAGE_FILE, JSON.stringify({
    messageId: msg.id
  }));

  console.log("✅ Panel baru dikirim");
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
  if (msg.channel.id !== PANEL_CHANNEL_ID) return;
  if (msg.author.bot) return;

  // hapus semua chat user di channel panel
  await msg.delete().catch(() => {});
});

// =======================
// 🎯 SELECT MENU ROLE
// =======================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "gender_select") {
    const member = interaction.member;

    const roleGent = interaction.guild.roles.cache.get(ROLE_GENTLEMAN);
    const roleLady = interaction.guild.roles.cache.get(ROLE_LADIES);

    if (interaction.values[0] === "gentleman") {
      await member.roles.remove(roleLady).catch(() => {});
      await member.roles.add(roleGent);

      console.log(`👔 ${interaction.user.tag} pilih Gentleman`);

      return interaction.reply({
        content: "👔 Kamu sekarang **Gentleman**",
        ephemeral: true
      });
    }

    if (interaction.values[0] === "ladies") {
      await member.roles.remove(roleGent).catch(() => {});
      await member.roles.add(roleLady);

      console.log(`🌸 ${interaction.user.tag} pilih Ladies`);

      return interaction.reply({
        content: "🌸 Kamu sekarang **Ladies**",
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
