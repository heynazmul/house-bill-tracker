// Talks to the Google Apps Script web app that lives inside your Google Sheet.
export async function callSheet(payload) {
  const url = process.env.SHEET_API_URL;
  const key = process.env.SHEET_API_KEY;
  if (!url || !key) {
    throw new Error('Server is missing SHEET_API_URL or SHEET_API_KEY.');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, key }),
    redirect: 'follow',
    cache: 'no-store',
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      'The Google Sheet script did not return data. Check that the Web app is deployed with access set to "Anyone".'
    );
  }
  if (data.error) throw new Error(data.error);
  return data;
}
