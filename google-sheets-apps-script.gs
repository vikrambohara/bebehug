/** Dr.Bohrras product catalogue endpoint (Google Apps Script).
 * Create a Google Sheet with a tab named Products and headers:
 * id | name | description | image | tag | variants_json | colours
 * variants_json example: [{"label":"S — 70 × 50 cm","value":"S","price":165},{"label":"M — 70 × 100 cm","value":"M","price":300}]
 * Use public image URLs (e.g. images hosted in a public Cloudflare/R2 bucket).
 * Deploy > New deployment > Web app; execute as Me; access Anyone.
 * This read-only endpoint exposes only product catalogue data. Do not store secrets here.
 */
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products');
  if (!sheet) return json({error:'Missing Products sheet'});
  const rows = sheet.getDataRange().getDisplayValues();
  if (rows.length < 2) return json([]);
  const headers = rows.shift().map(h => h.trim());
  const data = rows.filter(r => r.some(v => v !== '')).map(row => {
    const item = {}; headers.forEach((h,i) => item[h] = row[i]);
    try { item.variants = JSON.parse(item.variants_json || '[]'); } catch(e) { item.variants = []; }
    item.colours = (item.colours || '').split('|').map(x => x.trim()).filter(Boolean);
    return item;
  });
  return json(data);
}
function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
