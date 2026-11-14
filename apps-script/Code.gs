/**
 * Kichkintoy — Google Apps Script (script.google.com)
 * 1) Email yuboruvchi (veb-ilova): backend shu manzilga POST qiladi.
 * 2) Keep-alive: Render serverini har 5 daqiqada "uyg'otib" turadi (uxlab qolmasligi uchun).
 *
 * SOZLASH: Project Settings -> Script properties:
 *   SECRET       = backenddagi APPS_SCRIPT_SECRET bilan bir xil uzun tasodifiy qator
 *   BACKEND_URL  = https://SIZNING-BACKEND.onrender.com   (keep-alive uchun)
 */

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var data = JSON.parse(e.postData.contents);
    if (!props.getProperty('SECRET') || data.secret !== props.getProperty('SECRET')) {
      return json_({ ok: false, error: 'unauthorized' });
    }
    if (!data.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.to)) {
      return json_({ ok: false, error: 'bad_email' });
    }
    if (!data.subject || !data.html) {
      return json_({ ok: false, error: 'bad_payload' });
    }
    MailApp.sendEmail({
      to: data.to,
      subject: String(data.subject).substring(0, 200),
      htmlBody: data.html,
      body: 'Bu xabarni ko\'rish uchun HTML qo\'llab-quvvatlaydigan pochta dasturidan foydalaning.',
      name: data.fromName || 'Kichkintoy'
    });
    return json_({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'kichkintoy-mailer', remaining: MailApp.getRemainingDailyQuota() });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Time-driven trigger (har 5 daqiqa) shu funksiyani chaqiradi. */
function keepAlive() {
  var url = PropertiesService.getScriptProperties().getProperty('BACKEND_URL');
  if (!url) return;
  try {
    UrlFetchApp.fetch(url.replace(/\/$/, '') + '/health', { muteHttpExceptions: true, followRedirects: true });
  } catch (err) {
    console.error('keepAlive xato: ' + err);
  }
}

/** Bir marta qo'lda ishga tushiring: 5 daqiqalik triggerni yaratadi. */
function installKeepAliveTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'keepAlive') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('keepAlive').timeBased().everyMinutes(5).create();
}

/** Sinov: o'z emailingizga xat yuboradi (ruxsat so'rash uchun ham shuni bir marta ishga tushiring). */
function testSend() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Kichkintoy test', 'Ishlayapti!');
}
