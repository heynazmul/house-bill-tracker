# House Bill Memo

One page to generate your monthly house memo: **house rent + electricity (units x 12 tk)**.
Print it, share it on WhatsApp, and keep every month in a **Supabase** database.

```
Browser  ->  Vercel (Next.js, password login)  ->  Supabase (Postgres database)
```

Features: old reading filled from last month, live total, one-click memo (print / save as PDF / WhatsApp),
history with yearly totals, delete, CSV download, English and Bengali.

## Why Supabase and not SQLite?
Vercel runs your code as short-lived serverless functions with no permanent disk, so a SQLite file would be
wiped between requests and your memos would disappear. Supabase is a real hosted Postgres database that keeps
your data safely and lets you view or edit it in a table view.

---

## Setup (about 10 minutes, one time)

### 1. Supabase (database)
1. supabase.com > **New project** (free plan is fine). Wait until it is ready.
2. **SQL Editor > New query**, paste everything from `supabase/schema.sql`, click **Run**.
3. **Project Settings > API Keys**: copy the **Project URL** and the **secret** key (starts with `sb_secret_`; on older projects it is the `service_role` key).
   Keep the secret key private. It is only used on the server.

### 2. Vercel (website)
1. vercel.com > **Add New > Project** > import this GitHub repository.
2. Add these Environment Variables, then **Deploy**:

| Name | Value |
|---|---|
| `APP_PASSWORD` | the password you will type to open the app |
| `SESSION_SECRET` | any long random text |
| `SUPABASE_URL` | the Project URL from step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret key from step 1 |

3. Open the Vercel link, log in, and bookmark it (on a phone: Add to Home screen).

## Using it each month
1. Choose the month. The old reading is filled from last month; type the new reading.
2. Click **Generate memo & save**. It is saved in Supabase and the memo appears.
3. **Print memo** (choose "Save as PDF" to get a PDF) or **Share on WhatsApp**.

Generating the same month again asks before replacing it. Use **View** in History to reopen any memo.

## Changing things
- **Electricity rate** (12 tk/unit) is fixed in `lib/config.js`. Old memos keep the rate they were made with.
- **Default rent, house name, tenant name:** Settings section on the page.
- **See or edit raw data:** Supabase > Table Editor > `memos`.

## Run on your computer
```
npm install
cp .env.example .env.local   # fill in the four values
npm run dev
```

## Security notes
- The database tables have Row Level Security on with no public policies, so nobody can read them from a browser.
  Only this app's server can, using the secret key.
- The memo numbers are calculated on the server, not trusted from the browser.
- Use a strong `APP_PASSWORD`. Never commit `.env.local`.

## Troubleshooting
- **"The database tables are missing":** run `supabase/schema.sql` in the SQL Editor.
- **"Server is missing SUPABASE_URL...":** add the variables in Vercel and redeploy.
- **Wrong password on a correct password:** `SESSION_SECRET` and `APP_PASSWORD` must both be set.
