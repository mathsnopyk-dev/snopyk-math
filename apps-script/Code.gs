/**
 * snopyk.math — приймає заявки з сайту (POST), зберігає їх у Google-таблицю
 * і надсилає в Telegram.
 *
 * Налаштування:
 * 1. Встав токен бота (від @BotFather) у TELEGRAM_BOT_TOKEN нижче.
 * 2. Встав chat_id у TELEGRAM_CHAT_ID (як дізнатись — див. findChatId внизу).
 * 3. Вибери функцію setupSheet і натисни Run — дай дозвіл на Google Таблиці.
 *    У логах (Executions) буде посилання на створену таблицю заявок.
 * 4. Deploy → Manage deployments → ✏️ → Version: New version → Deploy
 *    (URL веб-застосунку при цьому не змінюється).
 */

const TELEGRAM_BOT_TOKEN = "ВСТАВ_СЮДИ_ТОКЕН_БОТА";
const TELEGRAM_CHAT_ID = "ВСТАВ_СЮДИ_CHAT_ID";

const SHEET_ID_PROPERTY = "LEADS_SHEET_ID";

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ status: "error", message: "Bad request" });
  }

  // Анти-спам: приховане поле website заповнюють лише боти — мовчки відкидаємо.
  if (data.website) {
    return jsonResponse({ status: "ok" });
  }

  // Та сама перевірка, що й на сайті, — на випадок ботів, які шлють запити напряму.
  const phoneDigits = String(data.phone || "").replace(/\D/g, "");
  if (String(data.name || "").trim().length < 2 || phoneDigits.length < 9 || phoneDigits.length > 15) {
    return jsonResponse({ status: "error", message: "Invalid name or phone" });
  }

  // Той самий номер протягом 10 хвилин — повтор (подвійний клік або спам), не дублюємо.
  const cache = CacheService.getScriptCache();
  const dedupeKey = "lead_" + phoneDigits;
  if (cache.get(dedupeKey)) {
    return jsonResponse({ status: "ok" });
  }

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

  let telegramOk = false;
  try {
    telegramOk = sendToTelegram(text);
  } catch (err) {
    telegramOk = false;
  }

  let sheetOk = false;
  try {
    getLeadsSheet().appendRow([
      new Date(), asText(name), asText(phone), asText(goal), asText(source), telegramOk ? "✅" : "❌",
    ]);
    sheetOk = true;
  } catch (err) {
    sheetOk = false;
  }

  // Заявка не загубилась, якщо дійшла хоча б кудись: у Telegram або в таблицю.
  if (telegramOk || sheetOk) {
    cache.put(dedupeKey, "1", 600);
    return jsonResponse({ status: "ok" });
  }
  return jsonResponse({ status: "error", message: "Lead was not delivered" });
}

/** Повертає true лише коли Telegram підтвердив, що повідомлення доставлено. */
function sendToTelegram(text) {
  const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
    }),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) return false;
  return JSON.parse(response.getContentText()).ok === true;
}

/** Таблиця заявок; створюється автоматично при першому запуску. */
function getLeadsSheet() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty(SHEET_ID_PROPERTY);
  if (sheetId) {
    return SpreadsheetApp.openById(sheetId).getSheets()[0];
  }
  const spreadsheet = SpreadsheetApp.create("snopyk.math — заявки з сайту");
  const sheet = spreadsheet.getSheets()[0];
  sheet.appendRow(["Дата", "Ім'я", "Телефон", "Клас / мета", "Джерело", "Telegram"]);
  sheet.setFrozenRows(1);
  props.setProperty(SHEET_ID_PROPERTY, spreadsheet.getId());
  return sheet;
}

/**
 * Апостроф на початку змушує Таблицю зберегти значення як текст:
 * інакше "+380…" стає формулою (#ERROR!), а "=…" з форми — виконується.
 */
function asText(value) {
  return "'" + String(value);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Запусти один раз вручну (Run): дасть дозвіл на Таблиці, створить таблицю
 * заявок і виведе посилання на неї в логи.
 */
function setupSheet() {
  const sheet = getLeadsSheet();
  Logger.log("Таблиця заявок: " + sheet.getParent().getUrl());
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
