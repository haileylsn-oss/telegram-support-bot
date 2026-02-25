const { Telegraf, Markup, session } = require("telegraf");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_CHAT_ID);

bot.use(session());

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

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

/* ---------------- BACK TO MAIN ---------------- */
bot.action("back_main", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session = null;

  ctx.reply(
    `Main Menu`,
    Markup.inlineKeyboard([
      [Markup.button.callback("Technical Support 🛠️", "support")],
      [Markup.button.callback("Partnership Request 🤝", "partnership")],
      [Markup.button.callback("Something Else ❓", "other")],
    ])
  );
});

/* ---------------- TECHNICAL SUPPORT ---------------- */
bot.action("support", async (ctx) => {
  await ctx.answerCbQuery();

  if (ctx.session && ctx.session.ticketOpen) {
    return ctx.reply(
      `⚠️ You already have an open ticket.\n\n🎫 ${ctx.session.ticketId}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🔒 Close Ticket", "close_ticket")],
      ])
    );
  }

  ctx.reply(
    `You have selected Technical Support 🛠️\n\nSelect issue type below:`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🐞 Bug Report", "bug")],
      [Markup.button.callback("💳 Transaction Query", "transaction")],
      [Markup.button.callback("⚠️ Glitch Error", "glitch")],
      [Markup.button.callback("🛠 Other Technical Report", "other_issue")],
      [Markup.button.callback("⬅ Back", "back_main")],
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
    other_issue: "Other Technical Report",
  };

  const ticketId = generateTicketId();

  ctx.session = {
    ticketOpen: true,
    ticketId: ticketId,
    category: categories[ctx.callbackQuery.data],
    startedAt: Date.now(),
  };

  ctx.reply(
    `✅ Ticket Opened Successfully!\n\n` +
      `🎫 Ticket ID: ${ticketId}\n` +
      `📂 Category: ${ctx.session.category}\n\n` +
      `Please describe your issue in detail.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🔒 Close Ticket", "close_ticket")],
    ])
  );
});

/* ---------------- CLOSE TICKET ---------------- */
bot.action("close_ticket", async (ctx) => {
  await ctx.answerCbQuery();

  if (!ctx.session || !ctx.session.ticketOpen) {
    return ctx.reply("❌ No active ticket.");
  }

  const ticketId = ctx.session.ticketId;
  ctx.session = null;

  ctx.reply(
    `🔒 Ticket ${ticketId} has been closed.\n\nType /start to open a new ticket.`
  );
});

/* ---------------- PARTNERSHIP ---------------- */
bot.action("partnership", async (ctx) => {
  await ctx.answerCbQuery();

  const ticketId = generateTicketId();

  ctx.session = {
    ticketOpen: true,
    ticketId: ticketId,
    category: "Partnership Request",
    startedAt: Date.now(),
  };

  ctx.reply(
    `🤝 Partnership Ticket Created\n\n🎫 Ticket ID: ${ticketId}\n\nPlease describe your proposal.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🔒 Close Ticket", "close_ticket")],
    ])
  );
});

/* ---------------- OTHER ---------------- */
bot.action("other", async (ctx) => {
  await ctx.answerCbQuery();

  const ticketId = generateTicketId();

  ctx.session = {
    ticketOpen: true,
    ticketId: ticketId,
    category: "General Inquiry",
    startedAt: Date.now(),
  };

  ctx.reply(
    `❓ General Ticket Created\n\n🎫 Ticket ID: ${ticketId}\n\nPlease explain your request.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🔒 Close Ticket", "close_ticket")],
    ])
  );
});

/* ---------------- MESSAGE HANDLER ---------------- */
bot.on("text", async (ctx) => {
  const user = ctx.from;

  /* ---------- ADMIN REPLY ---------- */
  if (user.id === ADMIN_ID) {
    const replyTo = ctx.message.reply_to_message;

    if (!replyTo || !replyTo.text) {
      return ctx.reply("Reply to a user ticket message.");
    }

    const match = replyTo.text.match(/USERID-(\d+)/);
    if (!match) return ctx.reply("User ID not found.");

    const userId = Number(match[1]);

    try {
      await bot.telegram.sendMessage(
        userId,
        `💬 Support Reply\n\n${ctx.message.text}`
      );

      ctx.reply("✅ Reply sent.");
    } catch (err) {
      ctx.reply("❌ Failed to send.");
    }

    return;
  }

  /* ---------- USER MESSAGE ---------- */
  if (!ctx.session || !ctx.session.ticketOpen) {
    return ctx.reply("⚠️ Please type /start and open a ticket first.");
  }

  if (Date.now() - ctx.session.startedAt > SESSION_TIMEOUT) {
    ctx.session = null;
    return ctx.reply("⏰ Session expired. Please type /start again.");
  }

  try {
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📩 New Ticket Message\n\n` +
        `🎫 Ticket ID: ${ctx.session.ticketId}\n` +
        `👤 ${user.first_name} (@${user.username || "no_username"})\n` +
        `🆔 USERID-${user.id}\n` +
        `📂 ${ctx.session.category}\n\n` +
        `💬 ${ctx.message.text}\n\n` +
        `Reply to respond`
    );

    ctx.reply("✅ Message sent to support.");
  } catch (err) {
    ctx.reply("❌ Failed to send message.");
  }
});

/* ---------------- LAUNCH ---------------- */
bot.launch();
console.log("🎫 Ticket Support Bot Running...");