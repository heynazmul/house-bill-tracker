/**
 * House Bill Tracker - Google Sheet API
 *
 * This script lives INSIDE your Google Sheet (Extensions > Apps Script).
 * It is the "database layer": the website (on Vercel) calls it to read settings,
 * read past receipts and save new ones. Nothing else is needed.
 *
 * 1. Change SECRET_KEY below to a long random text (the same text goes into Vercel as SHEET_API_KEY).
 * 2. Run the function  setup  once (authorizes the script and creates the Settings + Records tabs).
 * 3. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone. Copy the URL.
 */

const SECRET_KEY = 'PASTE-A-LONG-RANDOM-KEY-HERE';

const SETTINGS_SHEET = 'Settings';
const RECORDS_SHEET = 'Records';
const HEADERS = [
  'Receipt No', 'Month', 'Old Reading', 'New Reading', 'Units', 'Electricity',
  'VAT', 'Demand Charge', 'House Rent', 'Gas Bill', 'Other Charges', 'Other Note',
  'Total', 'Created'
];

/* ---------- Entry points ---------- */

function doGet() {
  return json_({ ok: true, message: 'House Bill Tracker API is running. It only answers secure POST requests.' });
}

function doPost(e) {
  try {
    if (!SECRET_KEY || SECRET_KEY.indexOf('PASTE-') === 0) {
      return json_({ error: 'Set SECRET_KEY in Code.gs first, then deploy a new version.' });
    }
    const body = JSON.parse(e.postData.contents);
    if (body.key !== SECRET_KEY) return json_({ error: 'Unauthorized: key does not match.' });

    if (body.action === 'init') return json_(init_());
    if (body.action === 'save') return json_(save_(body.record, body.overwrite));
    return json_({ error: 'Unknown action.' });
  } catch (err) {
    return json_({ error: String((err && err.message) || err) });
  }
}

// Run this once from the editor: it asks for permission and creates the tabs.
function setup() {
  ensureSheets_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Settings and Records tabs are ready. Now deploy as a Web app.');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Sheets ---------- */

function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let settings = ss.getSheetByName(SETTINGS_SHEET);
  if (!settings) {
    settings = ss.insertSheet(SETTINGS_SHEET);
    const rows = [
      ['Setting', 'Value'],
      ['House Name', 'My House'],
      ['Tenant / Owner Name', ''],
      ['House Rent', 10000],
      ['Gas Bill', 1000],
      ['Use Slabs (Yes/No)', 'No'],
      ['Flat Rate Per Unit', 8],
      ['VAT %', 5],
      ['Demand Charge', 0],
      ['Receipt Prefix', 'RC']
    ];
    settings.getRange(1, 1, rows.length, 2).setValues(rows);

    // EXAMPLE slabs - replace with the real ones from your electricity bill.
    const slabs = [
      ['Slab Up To Units', 'Rate Per Unit'],
      [75, 5.26], [200, 7.20], [300, 7.59], [400, 8.02], [600, 12.67], ['', 14.61]
    ];
    settings.getRange(1, 4, slabs.length, 2).setValues(slabs);
    settings.getRange('G1').setValue('Notes');
    settings.getRange('G2').setValue(
      'Slabs are used only when "Use Slabs" = Yes. Rows go from small to large; leave "Up To Units" blank on the last row (= everything above). The rates shown are EXAMPLES - copy the real ones from your bill.'
    );
    settings.getRange('A1:B1').setFontWeight('bold');
    settings.getRange('D1:E1').setFontWeight('bold');
    settings.setColumnWidth(1, 200);
    settings.setColumnWidth(2, 140);
  }

  let records = ss.getSheetByName(RECORDS_SHEET);
  if (!records) {
    records = ss.insertSheet(RECORDS_SHEET);
    records.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    records.setFrozenRows(1);
  }
  records.getRange('B:B').setNumberFormat('@'); // keep "2026-10" as text, never a date

  return { ss: ss, settings: settings, records: records };
}

function readSettings_(sh) {
  const last = Math.max(sh.getLastRow(), 2);
  const map = {};
  sh.getRange(2, 1, last - 1, 2).getValues().forEach(function (r) {
    if (r[0] !== '') map[String(r[0]).trim()] = r[1];
  });

  const slabs = [];
  sh.getRange(2, 4, last - 1, 2).getValues().forEach(function (r) {
    if (r[1] !== '' && !isNaN(Number(r[1]))) {
      slabs.push({ upTo: r[0] === '' ? null : Number(r[0]), rate: Number(r[1]) });
    }
  });
  slabs.sort(function (a, b) {
    return (a.upTo === null ? Infinity : a.upTo) - (b.upTo === null ? Infinity : b.upTo);
  });

  return {
    houseName: String(map['House Name'] || ''),
    person: String(map['Tenant / Owner Name'] || ''),
    rent: Number(map['House Rent']) || 0,
    gas: Number(map['Gas Bill']) || 0,
    useSlabs: String(map['Use Slabs (Yes/No)']).trim().toLowerCase() === 'yes',
    flatRate: Number(map['Flat Rate Per Unit']) || 0,
    vat: Number(map['VAT %']) || 0,
    demand: Number(map['Demand Charge']) || 0,
    prefix: String(map['Receipt Prefix'] || 'RC'),
    slabs: slabs
  };
}

function normMonth_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM');
  return String(v).trim();
}

function readRecords_(sheets) {
  const sh = sheets.records;
  const tz = sheets.ss.getSpreadsheetTimeZone();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const list = [];
  sh.getRange(2, 1, n, HEADERS.length).getValues().forEach(function (r) {
    if (!r[0]) return;
    list.push({
      receiptNo: String(r[0]),
      month: normMonth_(r[1], tz),
      oldReading: Number(r[2]),
      newReading: Number(r[3]),
      units: Number(r[4]),
      electricity: Number(r[5]),
      vat: Number(r[6]),
      demand: Number(r[7]),
      rent: Number(r[8]),
      gas: Number(r[9]),
      other: Number(r[10]) || 0,
      note: String(r[11] || ''),
      total: Number(r[12])
    });
  });
  list.sort(function (a, b) { return a.month < b.month ? 1 : a.month > b.month ? -1 : 0; });
  return list;
}

/* ---------- Actions ---------- */

function init_() {
  const sheets = ensureSheets_();
  return { settings: readSettings_(sheets.settings), records: readRecords_(sheets) };
}

function save_(rec, overwrite) {
  if (!rec || !/^\d{4}-\d{2}$/.test(String(rec.month))) throw new Error('Invalid month.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheets = ensureSheets_();
    const sh = sheets.records;
    const tz = sheets.ss.getSpreadsheetTimeZone();

    let row = -1;
    const n = sh.getLastRow() - 1;
    if (n > 0) {
      const months = sh.getRange(2, 2, n, 1).getValues();
      for (let i = 0; i < months.length; i++) {
        if (normMonth_(months[i][0], tz) === rec.month) { row = i + 2; break; }
      }
    }
    if (row > 0 && !overwrite) return { status: 'exists' };

    const values = [
      rec.receiptNo, rec.month, rec.oldReading, rec.newReading, rec.units, rec.electricity,
      rec.vat, rec.demand, rec.rent, rec.gas, rec.other, rec.note || '', rec.total, new Date()
    ];
    const target = row > 0 ? row : sh.getLastRow() + 1;
    sh.getRange(target, 1, 1, values.length).setValues([values]);

    return { status: 'ok', records: readRecords_(sheets) };
  } finally {
    lock.releaseLock();
  }
}
