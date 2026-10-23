// エアコンクリーニングさわやか 予約受付スクリプト
// 予約フォームから届いた内容を、このスプレッドシートの「予約」シートに1行ずつ記録し、
// お店とお客様にメールを送ります。

// ===== ここを自分のお店に合わせて書き換えてください =====
const SETTINGS = {
  SHOP_NAME: "エアコンクリーニングさわやか",
  // 予約通知を受け取るメールアドレス。空ならこのスクリプトの持ち主（あなたのGoogleアカウント）に届きます
  NOTIFY_TO: "",
  // お客様に確認メールを送るか
  SEND_CONFIRMATION: true,
  SHEET_NAME: "予約"
};
// =====================================================

const COLUMNS = [
  ["受付番号", "id"], ["受付日時", "received_at"], ["お名前", "name"], ["電話番号", "phone"],
  ["メール", "email"], ["エリア", "area"], ["郵便番号", "zip"], ["住所", "address"],
  ["住まい", "housing"], ["第1希望", "date1"], ["第2希望", "date2"], ["第3希望", "date3"],
  ["台数", "units_qty"], ["お掃除機能付き", "auto_qty"], ["3点セット", "set3_qty"], ["2点セット", "set2_qty"],
  ["防カビコート", "coat_qty"], ["室外機", "outdoor_qty"], ["ドレンホース", "drain_qty"],
  ["内訳", "breakdown"], ["概算金額", "total"], ["支払い方法", "payment"], ["駐車場", "parking"],
  ["その他のご相談", "consult"], ["備考", "note"], ["紹介コード", "ref_code"], ["状況", "status"]
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 同時に送信されても受付番号が重ならないように
    const d = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    const now = new Date();
    d.id = "S" + Utilities.formatDate(now, "Asia/Tokyo", "yyMMdd") + "-" + sheet.getLastRow();
    d.received_at = Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd HH:mm");
    d.status = "未対応";
    // 先頭が = + - @ の入力は数式として実行されないよう ' を付ける
    sheet.appendRow(COLUMNS.map(([, k]) => {
      const v = d[k] == null ? "" : d[k];
      return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v;
    }));
    lock.releaseLock();

    sendShopMail_(d);
    if (SETTINGS.SEND_CONFIRMATION && d.email) sendCustomerMail_(d);
    return json_({ ok: true, id: d.id });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SETTINGS.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS.SHEET_NAME);
    sheet.appendRow(COLUMNS.map(([h]) => h));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold").setBackground("#fdeee2");
  }
  return sheet;
}

function summary_(d) {
  return [
    "受付番号：" + d.id,
    "お名前：" + d.name + " 様",
    "電話番号：" + d.phone,
    "メール：" + d.email,
    "ご住所：" + (d.zip ? "〒" + d.zip + " " : "") + d.address + "（" + d.area + "・" + d.housing + "）",
    "",
    "【希望日】",
    "第1希望：" + d.date1,
    "第2希望：" + d.date2,
    "第3希望：" + d.date3,
    "",
    "【ご依頼内容】",
    d.breakdown.split(" / ").join("\n"),
    "概算金額：" + Number(d.total).toLocaleString("ja-JP") + "円（税込・駐車場代別）",
    "",
    "お支払い方法：" + d.payment,
    "駐車場：" + d.parking,
    d.consult ? "その他のご相談：" + d.consult : "",
    d.ref_code ? "紹介コード：" + d.ref_code : "",
    d.note ? "\n【ご要望・備考】\n" + d.note : ""
  ].filter(s => s !== "").join("\n");
}

function sendShopMail_(d) {
  const to = SETTINGS.NOTIFY_TO || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to,
    replyTo: d.email,
    subject: "【新規予約】" + d.name + " 様（" + d.area + "・" + d.units_qty + "台）" + d.id,
    body: "予約フォームから新しい予約が届きました。\n\n" + summary_(d) +
      "\n\nスプレッドシート：" + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  });
}

function sendCustomerMail_(d) {
  MailApp.sendEmail({
    to: d.email,
    name: SETTINGS.SHOP_NAME,
    subject: "【" + SETTINGS.SHOP_NAME + "】ご予約を受け付けました（" + d.id + "）",
    body: d.name + " 様\n\n" +
      "このたびは" + SETTINGS.SHOP_NAME + "にご予約いただき、ありがとうございます。\n" +
      "以下の内容で受け付けました。作業日は担当者よりご連絡のうえ確定いたします。\n\n" +
      summary_(d) +
      "\n\n※金額は概算です。\n" +
      "ご不明な点は、このメールへの返信でお問い合わせください。\n\n" +
      SETTINGS.SHOP_NAME
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 設定後に一度だけ手動で実行すると、権限の許可とテスト（シート作成・メール送信）ができます
function testSetup() {
  const res = doPost({ postData: { contents: JSON.stringify({
    name: "テスト 太郎", phone: "000-0000-0000", email: "", area: "東京", zip: "", address: "テスト住所",
    housing: "戸建て", date1: "2026-11-10 9時〜12時", date2: "2026-11-11 9時〜12時", date3: "2026-11-12 9時〜12時",
    units_qty: 1, auto_qty: 0, set3_qty: 0, set2_qty: 0, coat_qty: 0, outdoor_qty: 0, drain_qty: 0,
    breakdown: "エアコン台数（壁掛け） 1台=5,980円", total: 5980, payment: "作業当日にお支払い（現金）",
    parking: "敷地内に駐車可", consult: "", note: "これはテストです", ref_code: ""
  }) } });
  Logger.log(res.getContent());
}
