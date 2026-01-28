import { Telegraf, Markup, session } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_CHAT_ID); // Ensure it's a number

bot.use(session());

// ----------- START COMMAND -----------
bot.start((ctx) => {
  ctx.reply(
    `👋 Hi ${ctx.from.first_name}, thanks for reaching out!\n\n` +
      `If you have already read our FAQs and still need help, please select one of the options below.\n\n` +
      `A team member will aim to respond within a few hours, but during busy times, it might take longer.\n\n` +
      `(Stay safe frens – Don't share your password or seed phrase with anyone)`,
    Markup.inlineKeyboard([
      [Markup.button.callback("Technical Support 🛠️", "support")],
      [Markup.button.callback("Partnership Request 🤝", "partnership")],
      [Markup.button.callback("Something Else ❓", "other")]
    ])
  );
});

// ----------- INLINE BUTTON HANDLER (User selects category) -----------
bot.action(/.*/, async (ctx) => {
  await ctx.answerCbQuery();
  let category = "";

  if (ctx.callbackQuery.data === "support") category = "Technical Support";
  if (ctx.callbackQuery.data === "partnership") category = "Partnership Request";
  if (ctx.callbackQuery.data === "other") category = "Something Else";

  ctx.session.category = category;
  await ctx.reply(`✅ You selected ${category}. Please type your message below.`);
});

// ----------- SINGLE MESSAGE HANDLER FOR BOTH USERS AND ADMIN -----------
bot.on("text", async (ctx) => {
  const user = ctx.from;

  // --------- ADMIN REPLY ---------
  if (user.id === ADMIN_ID) {
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo) {
      console.log("❌ Admin message is not a reply");
      return;
    }

    console.log("Admin is replying to message text:");
    console.log(replyTo.text);

    // Extract user ID from safe marker
    const match = replyTo.text?.match(/USERID-(\d+)/);
    if (!match) {
      console.log("❌ Could not extract user ID from replied message");
      return;
    }

    const userId = Number(match[1]);
    console.log("✅ Extracted user ID:", userId);

    const replyText = ctx.message.text;

    try {
      await bot.telegram.sendMessage(userId, `💬 Support Reply:\n\n${replyText}`);
      console.log(`✅ Reply sent to user ${userId}`);
      await ctx.reply(`✅ Reply sent to user ${userId}`);
    } catch (err) {
      console.error(
        "❌ Failed to send reply to user. Make sure user has started the bot.",
        err
      );
      await ctx.reply("❌ Failed to send reply. User may not have started the bot.");
    }
    return; // Done processing admin message
  }

  // --------- USER MESSAGE ---------
  const message = ctx.message.text;
  const category = ctx.session?.category || "Uncategorized";

  console.log("MESSAGE FROM USER:", user.id, message, "Category:", category);

  try {
    // Send message to admin with safe USERID marker
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📩 New Support Message
👤 User: ${user.first_name} (@${user.username || "no_username"})
USERID-${user.id}
Category: ${category}

Message:
${message}

✍️ Reply to this message to respond to the user`
    );

    await ctx.reply("✅ Message received! Support will reply soon.");
  } catch (err) {
    console.error("Error sending message to admin:", err);
    await ctx.reply("❌ Failed to send your message. Try again later.");
  }
});

// ----------- LAUNCH BOT -----------
bot.launch();
console.log("🤖 Bot with fixed USERID marker is running...");
