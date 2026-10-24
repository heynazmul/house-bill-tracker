# House Bill Tracker

Enter your electricity meter readings each month, click one button, and get a printable receipt.
Every receipt is saved in **your Google Sheet** (the database). The website runs free on **Vercel**.

```
Browser  ->  Vercel (Next.js app, password login)  ->  Apps Script web app  ->  Google Sheet
```

Features: old reading auto-filled from last month, slab or flat electricity rate, VAT, rent, gas, other charges,
one-click receipt (print / save as PDF / share on WhatsApp), history with yearly totals, English and Bengali.

---

## Setup (about 15 minutes, one time)

### 1. Google Sheet + Apps Script (this is your database)
1. Create a new Google Sheet, name it **House Bills**.
2. **Extensions > Apps Script**. Delete the default code and paste everything from `apps-script/Code.gs`.
3. At the top, change `SECRET_KEY` to a long random text, for example 30+ random letters and numbers. Keep a copy: it must match `SHEET_API_KEY` in Vercel.
4. Save, choose the function **setup** in the dropdown, and click **Run**. Allow the permissions (Advanced > Go to project > Allow). The **Settings** and **Records** tabs appear in your sheet.
5. **Deploy > New deployment > Web app**. Execute as: **Me**. Who has access: **Anyone**. Click **Deploy** and copy the **Web app URL**.
   - "Anyone" only means the URL can be reached. Without your `SECRET_KEY` it returns nothing, so your data stays private.
6. Open the **Settings** tab and edit: house name, rent, gas bill, VAT %, flat rate per unit, or turn on slabs (`Use Slabs = Yes`) and replace the example slab rates with the real ones from your electricity bill.

### 2. Put the code on GitHub
Create an empty repository on github.com (private is fine), then run in this folder:
```
git init
git add .
git commit -m "House bill tracker"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/house-bill-tracker.git
git push -u origin main
```

### 3. Deploy on Vercel
1. vercel.com > **Add New > Project** > import the GitHub repository.
2. Before clicking Deploy, open **Environment Variables** and add these four:

| Name | Value |
|---|---|
| `APP_PASSWORD` | the password you will type to open the app |
| `SESSION_SECRET` | any long random text |
| `SHEET_API_URL` | the Web app URL from step 1 |
| `SHEET_API_KEY` | exactly the same text as `SECRET_KEY` in Code.gs |

3. Click **Deploy**. Open the URL Vercel gives you and bookmark it (on a phone: Add to Home screen).

---

## Using it each month
1. Open the site and log in.
2. Choose the month. The old reading is filled from last month. Type the new reading.
3. Click **Generate receipt**. The row is saved in the **Records** tab.
4. Click **Print / Save as PDF** (choose "Save as PDF" as the destination) or **Share on WhatsApp**.

Generating the same month again asks before replacing the old receipt. Past receipts can be opened from History.

## Changing things later
- **Rates, VAT, default rent and gas:** edit the **Settings** tab. The app reads it every time it opens.
- **Edited Code.gs?** Deploy > Manage deployments > pencil icon > Version: New version > Deploy (the URL stays the same).
- **Changed an environment variable on Vercel?** Redeploy once for it to apply.

## Run on your computer
```
npm install
cp .env.example .env.local   # then fill in the four values
npm run dev
```

## Troubleshooting
- **"The Google Sheet script did not return data":** the Web app must be deployed with access **Anyone**, and `SHEET_API_URL` must end with `/exec`.
- **"Unauthorized: key does not match":** `SHEET_API_KEY` on Vercel differs from `SECRET_KEY` in Code.gs. After changing Code.gs, deploy a new version.
- **Month shows as a date in the sheet:** keep column B of **Records** formatted as plain text.
- **Bengali text in the PDF looks wrong:** the PDF is made by your browser's print dialog, so use a recent Chrome.
