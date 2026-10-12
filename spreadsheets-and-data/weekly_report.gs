/**
 * Weekly Sales Report - Google Sheets + Apps Script
 *
 * Every Monday at 8:00 this script:
 *   1. reads the "Orders" sheet (Date | Customer | Product | Units | Unit Price),
 *   2. compares the last 7 days with the 7 days before,
 *   3. appends a row to "Weekly Summary",
 *   4. emails an HTML report to everyone listed in CONFIG.recipients.
 *
 * Setup: Extensions > Apps Script, paste this file, set CONFIG, then run
 * installWeeklyTrigger() once and approve the permissions prompt.
 */
const CONFIG = {
  ordersSheet: 'Orders',
  summarySheet: 'Weekly Summary',
  recipients: ['manager@example.com'],
  currency: 'USD',
  sendHour: 8,
};

/** Adds a "Reports" menu so the report can also be sent on demand. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Reports')
    .addItem('Send weekly report now', 'sendWeeklyReport')
    .addItem('Install Monday trigger', 'installWeeklyTrigger')
    .addToUi();
}

/** Creates the Monday-morning trigger (removes old copies first, so it is safe to rerun). */
function installWeeklyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'sendWeeklyReport')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(CONFIG.sendHour)
    .create();
}

function sendWeeklyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const orders = readOrders_(ss.getSheetByName(CONFIG.ordersSheet));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = addDays_(today, -7);
  const prevStart = addDays_(today, -14);

  const thisWeek = summarize_(orders.filter(o => o.date >= weekStart && o.date < today));
  const lastWeek = summarize_(orders.filter(o => o.date >= prevStart && o.date < weekStart));

  appendSummary_(ss, weekStart, thisWeek, lastWeek);

  const subject = `Weekly sales: ${money_(thisWeek.revenue)} (${pctChange_(thisWeek.revenue, lastWeek.revenue)} vs last week)`;
  MailApp.sendEmail({
    to: CONFIG.recipients.join(','),
    subject: subject,
    htmlBody: buildHtml_(weekStart, today, thisWeek, lastWeek, ss.getUrl()),
  });
}

/** Reads the Orders sheet, skipping blank or malformed rows instead of failing. */
function readOrders_(sheet) {
  if (!sheet) throw new Error(`Sheet "${CONFIG.ordersSheet}" not found`);
  const rows = sheet.getDataRange().getValues().slice(1);
  return rows
    .filter(r => r[0] instanceof Date && Number(r[3]) > 0)
    .map(r => ({
      date: r[0],
      customer: String(r[1]).trim(),
      product: String(r[2]).trim(),
      revenue: Number(r[3]) * Number(r[4] || 0),
    }));
}

function summarize_(orders) {
  const byProduct = {};
  const customers = new Set();
  let revenue = 0;
  orders.forEach(o => {
    revenue += o.revenue;
    customers.add(o.customer);
    byProduct[o.product] = (byProduct[o.product] || 0) + o.revenue;
  });
  const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { revenue, orders: orders.length, customers: customers.size, topProducts: top };
}

function appendSummary_(ss, weekStart, thisWeek, lastWeek) {
  let sheet = ss.getSheetByName(CONFIG.summarySheet);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.summarySheet);
    sheet.appendRow(['Week starting', 'Revenue', 'Orders', 'Customers', 'Change vs prior week']);
    sheet.getRange('A1:E1').setFontWeight('bold');
  }
  sheet.appendRow([weekStart, thisWeek.revenue, thisWeek.orders, thisWeek.customers,
    pctChange_(thisWeek.revenue, lastWeek.revenue)]);
}

function buildHtml_(from, to, w, prev, url) {
  const tz = Session.getScriptTimeZone();
  const range = `${Utilities.formatDate(from, tz, 'MMM d')} - ${Utilities.formatDate(addDays_(to, -1), tz, 'MMM d, yyyy')}`;
  const card = (label, value, delta) => `
    <td style="padding:12px 16px;background:#f4f6fa;border-radius:8px">
      <div style="font-size:12px;color:#5b6475">${label}</div>
      <div style="font-size:22px;font-weight:bold;color:#1f3a5e">${value}</div>
      <div style="font-size:12px;color:#5b6475">${delta}</div>
    </td>`;
  const products = w.topProducts.map(([name, rev]) =>
    `<tr><td style="padding:4px 12px 4px 0">${name}</td><td style="text-align:right">${money_(rev)}</td></tr>`).join('');
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#1f3a5e;margin-bottom:4px">Weekly sales report</h2>
      <div style="color:#5b6475;margin-bottom:16px">${range}</div>
      <table cellspacing="8"><tr>
        ${card('Revenue', money_(w.revenue), pctChange_(w.revenue, prev.revenue) + ' vs last week')}
        ${card('Orders', w.orders, pctChange_(w.orders, prev.orders) + ' vs last week')}
        ${card('Customers', w.customers, '')}
      </tr></table>
      <h3 style="color:#1f3a5e">Top products</h3>
      <table>${products || '<tr><td>No orders this week</td></tr>'}</table>
      <p><a href="${url}">Open the full sheet</a></p>
    </div>`;
}

function addDays_(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function money_(n) {
  return Utilities.formatString('%s %s', CONFIG.currency, Math.round(n).toLocaleString('en-US'));
}

function pctChange_(now, before) {
  if (!before) return now ? 'new' : '0%';
  const pct = Math.round(((now - before) / before) * 100);
  return (pct >= 0 ? '+' : '') + pct + '%';
}
