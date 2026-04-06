require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
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

const PREFIX = "b";

const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

let connection;

// 🔥 JOIN VC FUNCTION
async function connectToVC() {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return console.log("❌ Guild tidak ditemukan");

    connection = joinVoiceChannel({
      channelId: VOICE_CHANNEL_ID,
      guildId: GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfMute: true,
      selfDeaf: true
    });

    console.log("✅ Bot masuk voice channel");

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log("⚠️ Terputus, mencoba reconnect...");
      setTimeout(connectToVC, 3000);
    });

  } catch (err) {
    console.log("❌ Error:", err);
    setTimeout(connectToVC, 5000);
  }
}

// 🚀 READY
client.on("ready", () => {
  console.log(`🔥 Login sebagai ${client.user.tag}`);
  connectToVC();
});

// 🎮 COMMAND HANDLER
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.toLowerCase().startsWith(PREFIX)) return;

  const withoutPrefix = msg.content.slice(PREFIX.length).trim();
  const args = withoutPrefix.split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  if (cmd === "join") {
    connectToVC();
    msg.reply("✅ Bot masuk VC!");
  }

  if (cmd === "leave") {
    const conn = getVoiceConnection(GUILD_ID);
    if (conn) {
      conn.destroy();
      msg.reply("👋 Bot keluar VC!");
    } else {
      msg.reply("❌ Bot tidak ada di VC");
    }
  }

  if (cmd === "ping") {
    msg.reply("🏓 Pong!");
  }
});

// 🔐 LOGIN
client.login(process.env.TOKEN);