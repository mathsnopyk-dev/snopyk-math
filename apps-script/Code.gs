/**
 * snopyk.math — приймає заявки з сайту (POST) і надсилає їх у Telegram.
 *
 * Налаштування:
 * 1. Встав токен бота (від @BotFather) у TELEGRAM_BOT_TOKEN нижче.
 * 2. Встав chat_id у TELEGRAM_CHAT_ID (як дізнатись — див. інструкцію в чаті).
 * 3. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone.
 * 4. Скопіюй URL веб-застосунку і встав його в FORM_ENDPOINT у js/main.js на сайті.
 */

const TELEGRAM_BOT_TOKEN = "ВСТАВ_СЮДИ_ТОКЕН_БОТА";
const TELEGRAM_CHAT_ID = "ВСТАВ_СЮДИ_CHAT_ID";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const name = data.name || "—";
    const phone = data.phone || "—";
    const goal = data.goal || "—";
    const source = data.source || "snopyk.math site";

    const text =
      "📩 Нова заявка з сайту snopyk.math\n\n" +
      "👤 Ім'я: " + name + "\n" +
      "📞 Телефон: " + phone + "\n" +
      "🎯 Клас / мета: " + goal + "\n" +
      "🌐 Джерело: " + source;

    sendToTelegram(text);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendToTelegram(text) {
  const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
    }),
  });
}

/**
 * Допоміжна функція для першого налаштування: знаходить твій chat_id.
 * Як використати:
 * 1. Встав токен бота в TELEGRAM_BOT_TOKEN вище.
 * 2. Напиши боту будь-яке повідомлення в Telegram (наприклад "привіт").
 * 3. Тут, у редакторі Apps Script, вибери цю функцію (findChatId) і натисни Run.
 * 4. Відкрий View → Logs (або Executions) — там буде твій chat_id.
 */
function findChatId() {
  const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getUpdates";
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}
