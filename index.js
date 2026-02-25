import { Telegraf, Markup, session } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_CHAT_ID);

bot.use(session());

const SESSION_TIMEOUT = 10 * 60 * 1000;

/* ---------------- GENERATE RANDOM TICKET ID ---------------- */
function generateTicketId() {
  return "TICKET-" + Math.floor(100000 + Math.random() * 900000);
}

/* ---------------- START COMMAND ---------------- */
bot.start((ctx) => {
  ctx.session = null;

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

/* ---------------- TECH SUPPORT ---------------- */
bot.action("support", async (ctx) => {
  await ctx.answerCbQuery();

  if (ctx.session?.ticketOpen) {
    return ctx.reply(
      `⚠️ You already have an open ticket.\n🎫 ${ctx.session.ticketId}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🔒 Close Ticket", "close_ticket")],
      ])
    );
  }

  ctx.reply(
    `Select issue type:`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🐞 Bug Report", "bug")],
      [Markup.button.callback("💳 Transaction Query", "transaction")],
      [Markup.button.callback("⚠️ Glitch Error", "glitch")],
      [Markup.button.callback("🛠 Other Technical Issue", "other_issue")],
    ])
  );
});

/* ---------------- CREATE TICKET ---------------- */
bot.action(["bug", "transaction", "glitch", "other_issue"], async (ctx) => {
  await ctx.answerCbQuery();

  const categories = {
    bug: "Bug Report",
    transaction: "Transaction Query",
    glitch: "Glitch Error",
    other_issue: "Other Technical Issue",
  };

  const ticketId = generateTicketId();

  ctx.session = {
    ticketOpen: true,
    ticketId,
    category: categories[ctx.callbackQuery.data],
    startedAt: Date.now(),
  };

  ctx.reply(
    `✅ Ticket Opened\n\n🎫 ${ticketId}\n📂 ${ctx.session.category}\n\nDescribe your issue.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🔒 Close Ticket", "close_ticket")],
    ])
  );
});

/* ---------------- CLOSE TICKET ---------------- */
bot.action("close_ticket", async (ctx) => {
  await ctx.answerCbQuery();

  if (!ctx.session?.ticketOpen) {
    return ctx.reply("❌ No active ticket.");
  }

  const id = ctx.session.ticketId;
  ctx.session = null;

  ctx.reply(`🔒 Ticket ${id} closed.`);
});

/* ---------------- USER MESSAGE ---------------- */
bot.on("text", async (ctx) => {
  const user = ctx.from;

  if (!ctx.session?.ticketOpen) {
    return;
  }

  if (Date.now() - ctx.session.startedAt > SESSION_TIMEOUT) {
    ctx.session = null;
    return ctx.reply("⏰ Session expired. Type /start again.");
  }

  await bot.telegram.sendMessage(
    ADMIN_ID,
    `📩 New Ticket\n\n🎫 ${ctx.session.ticketId}\n👤 ${user.first_name}\n🆔 USERID-${user.id}\n📂 ${ctx.session.category}\n\n💬 ${ctx.message.text}`
  );

  ctx.reply("✅ Message sent to support.");
});

/* ---------------- LAUNCH ---------------- */
bot.launch();
console.log("🎫 Bot running...");