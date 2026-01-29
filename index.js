import { Telegraf, Markup, session } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_CHAT_ID);

// ⏱ Session timeout (5 minutes)
const SESSION_TIMEOUT = 5 * 60 * 1000;

bot.use(session());

/* ---------------- START COMMAND ---------------- */
bot.start((ctx) => {
  ctx.session = null; // reset session on /start

  ctx.reply(
    `👋 Hi ${ctx.from.first_name}, thanks for reaching out!\n\n` +
      `If you have already read our FAQs and still need help, please select one of the options below.\n\n` +
      `⏳ Sessions expire after a few minutes.\n\n` +
      `🔐 Stay safe — never share your password or seed phrase.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("Technical Support 🛠️", "support")],
      [Markup.button.callback("Partnership Request 🤝", "partnership")],
      [Markup.button.callback("Something Else ❓", "other")],
    ])
  );
});

/* ---------------- BUTTON HANDLERS ---------------- */
bot.action(["support", "partnership", "other"], async (ctx) => {
  await ctx.answerCbQuery();

  let category = "";
  let question = "";

  if (ctx.callbackQuery.data === "support") {
    category = "Technical Support";
    question =
      "🛠️ Please describe the technical issue you are facing.\n\nInclude error messages, screenshots, or steps if possible.";
  }

  if (ctx.callbackQuery.data === "partnership") {
    category = "Partnership Request";
    question =
      "🤝 Please explain your partnership idea and how you would like to collaborate.";
  }

  if (ctx.callbackQuery.data === "other") {
    category = "Something Else";
    question = "❓ Please explain your request in detail.";
  }

  ctx.session = {
    category,
    startedAt: Date.now(),
  };

  await ctx.reply(`✅ *${category} selected*\n\n${question}`, {
    parse_mode: "Markdown",
  });
});

/* ---------------- TEXT HANDLER ---------------- */
bot.on("text", async (ctx) => {
  const user = ctx.from;

  /* ---------- ADMIN REPLY ---------- */
  if (user.id === ADMIN_ID) {
    const replyTo = ctx.message.reply_to_message;

    if (!replyTo?.text) {
      return ctx.reply("❌ Please reply to a user message.");
    }

    const match = replyTo.text.match(/USERID-(\d+)/);
    if (!match) {
      return ctx.reply("❌ Could not find USER ID.");
    }

    const userId = Number(match[1]);

    try {
      await bot.telegram.sendMessage(
        userId,
        `💬 *Support Reply*\n\n${ctx.message.text}`,
        { parse_mode: "Markdown" }
      );

      await ctx.reply(`✅ Reply sent to user ${userId}`);
    } catch (err) {
      console.error(err);
      await ctx.reply("❌ Failed to send reply. User may not have started the bot.");
    }

    return;
  }

  /* ---------- USER MESSAGE ---------- */
  const sessionData = ctx.session;

  // ❌ No active session
  if (!sessionData?.category) {
    return ctx.reply("⚠️ Please type /start and select an option first.");
  }

  // ⏰ Session expired
  if (Date.now() - sessionData.startedAt > SESSION_TIMEOUT) {
    ctx.session = null;
    return ctx.reply(
      "⏰ Your session has expired.\n\nPlease type /start to begin again."
    );
  }

  const message = ctx.message.text;

  try {
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📩 *New Support Message*\n\n` +
        `👤 User: ${user.first_name} (@${user.username || "no_username"})\n` +
        `🆔 USERID-${user.id}\n` +
        `📂 Category: ${sessionData.category}\n\n` +
        `💬 Message:\n${message}\n\n` +
        `✍️ Reply to this message to respond`,
      { parse_mode: "Markdown" }
    );

    await ctx.reply("✅ Message received! Support will reply soon.");

    // 🔄 force restart after one message
    ctx.session = null;
  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Failed to send your message. Try again later.");
  }
});

/* ---------------- LAUNCH BOT ---------------- */
bot.launch();
console.log("🤖 Support bot is running...");
