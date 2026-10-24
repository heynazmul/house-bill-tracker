'use client';

import { useEffect, useMemo, useState } from 'react';
import { calcBill } from '../lib/calc';
import { T } from '../lib/i18n';

const money = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (n) => String(n).padStart(2, '0');
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const monthLabel = (m, lang) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
};
const sortRecords = (list) => [...(list || [])].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));

// Decide what the form should show for a given month.
function formFor(month, records, settings) {
  const existing = records.find((r) => r.month === month);
  if (existing) {
    return {
      hint: false,
      form: {
        month,
        oldReading: String(existing.oldReading),
        newReading: String(existing.newReading),
        rent: String(existing.rent),
        gas: String(existing.gas),
        other: String(existing.other || 0),
        note: existing.note || '',
      },
    };
  }
  const prev = records.filter((r) => r.month < month)[0]; // records are newest-first
  return {
    hint: Boolean(prev),
    form: {
      month,
      oldReading: prev ? String(prev.newReading) : '',
      newReading: '',
      rent: String(settings.rent),
      gas: String(settings.gas),
      other: '0',
      note: '',
    },
  };
}

function Receipt({ rec, settings, lang, t, onClose }) {
  const today = new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const label = monthLabel(rec.month, lang);

  const print = () => {
    const old = document.title;
    document.title = rec.receiptNo; // becomes the default PDF file name
    window.print();
    setTimeout(() => {
      document.title = old;
    }, 1500);
  };

  const wa = `https://wa.me/?text=${encodeURIComponent(
    `${rec.receiptNo} | ${label} | ${t.total}: ৳${money(rec.total)}`
  )}`;

  return (
    <div>
      <div className="receipt-card" id="receipt">
        <h2>{settings.houseName || t.receiptTitle}</h2>
        <div className="sub">{t.receiptTitle}</div>
        <div className="receipt-meta">
          <span>
            <b>{t.receiptNo}:</b> {rec.receiptNo}
          </span>
          <span>
            <b>{t.month}:</b> {label}
          </span>
        </div>
        {settings.person ? (
          <div className="receipt-meta">
            <span>
              <b>{t.name}:</b> {settings.person}
            </span>
          </div>
        ) : null}

        <div className="receipt-section">{t.meter}</div>
        <div className="row"><span>{t.oldShort}</span><span>{rec.oldReading}</span></div>
        <div className="row"><span>{t.newShort}</span><span>{rec.newReading}</span></div>
        <div className="row"><b>{t.units}</b><b>{rec.units}</b></div>

        <div className="receipt-section">{t.charges}</div>
        <div className="row"><span>{t.electricity}</span><span>{money(rec.electricity)}</span></div>
        <div className="row"><span>{t.vat}</span><span>{money(rec.vat)}</span></div>
        {rec.demand ? (
          <div className="row"><span>{t.demand}</span><span>{money(rec.demand)}</span></div>
        ) : null}
        <div className="row"><span>{t.rent}</span><span>{money(rec.rent)}</span></div>
        <div className="row"><span>{t.gas}</span><span>{money(rec.gas)}</span></div>
        {rec.other ? (
          <div className="row">
            <span>{rec.note ? `${t.other.replace(' (optional)', '')} (${rec.note})` : t.other.replace(' (optional)', '')}</span>
            <span>{money(rec.other)}</span>
          </div>
        ) : null}
        <div className="row total"><span>{t.total}</span><span>৳ {money(rec.total)}</span></div>

        <div className="receipt-foot">
          {t.date}: {today} &nbsp;|&nbsp; {t.thanks}
        </div>
      </div>

      <div className="receipt-actions no-print">
        <button type="button" onClick={print}>{t.print}</button>
        <a className="wa" href={wa} target="_blank" rel="noopener noreferrer">{t.whatsapp}</a>
        <button type="button" className="close" onClick={onClose}>{t.close}</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState('en');
  const [phase, setPhase] = useState('loading'); // loading | login | ready | error
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(null);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(null);
  const [hint, setHint] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: 'err' | 'warn', text, replace? }
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [password, setPassword] = useState('');
  const t = T[lang];

  useEffect(() => {
    try {
      const l = localStorage.getItem('hbt_lang');
      if (l === 'bn' || l === 'en') setLang(l);
    } catch {}
    load();
  }, []);

  async function load() {
    setPhase('loading');
    setError('');
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.status === 401) {
        setPhase('login');
        return;
      }
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not load data.');
      const recs = sortRecords(d.records);
      const f = formFor(thisMonth(), recs, d.settings);
      setSettings(d.settings);
      setRecords(recs);
      setForm(f.form);
      setHint(f.hint);
      setPhase('ready');
    } catch (e) {
      setError(e.message);
      setPhase('error');
    }
  }

  async function login(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError(t.wrongPassword);
      return;
    }
    setPassword('');
    load();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    setReceipt(null);
    setPhase('login');
  }

  function toggleLang() {
    const next = lang === 'en' ? 'bn' : 'en';
    setLang(next);
    try {
      localStorage.setItem('hbt_lang', next);
    } catch {}
  }

  function changeMonth(m) {
    const f = formFor(m, records, settings);
    setForm(f.form);
    setHint(f.hint);
    setMsg(null);
  }

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const preview = useMemo(() => {
    if (!form || !settings) return null;
    const o = parseFloat(form.oldReading);
    const n = parseFloat(form.newReading);
    if (Number.isNaN(o) || Number.isNaN(n) || n < o) return null;
    return calcBill(
      {
        oldReading: o,
        newReading: n,
        rent: parseFloat(form.rent) || 0,
        gas: parseFloat(form.gas) || 0,
        other: parseFloat(form.other) || 0,
      },
      settings
    );
  }, [form, settings]);

  async function generate(overwrite = false) {
    setMsg(null);
    const o = parseFloat(form.oldReading);
    const n = parseFloat(form.newReading);
    if (Number.isNaN(o) || Number.isNaN(n)) return setMsg({ kind: 'err', text: t.errReadings });
    if (n < o) return setMsg({ kind: 'err', text: t.errNegative });

    setBusy(true);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, overwrite }),
      });
      if (res.status === 401) {
        setPhase('login');
        return;
      }
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save.');
      if (d.status === 'exists') {
        setMsg({ kind: 'warn', text: t.exists, replace: true });
        return;
      }
      const recs = sortRecords(d.records);
      setRecords(recs);
      setSettings(d.settings);
      setReceipt(d.record);
      setHint(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  const yearTotals = useMemo(() => {
    const totals = {};
    records.forEach((r) => {
      const y = r.month.slice(0, 4);
      totals[y] = (totals[y] || 0) + r.total;
    });
    return Object.keys(totals)
      .sort()
      .reverse()
      .map((y) => [y, totals[y]]);
  }, [records]);

  /* ---------- Screens ---------- */

  if (phase === 'loading') {
    return <div className="wrap"><p className="muted">{t.loading}</p></div>;
  }

  if (phase === 'login') {
    return (
      <div className="wrap">
        <form className="card center" onSubmit={login}>
          <h1 style={{ fontSize: 20, marginTop: 0 }}>{t.appTitle}</h1>
          <label htmlFor="pw">{t.password}</label>
          <input id="pw" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <div className="msg err">{error}</div> : null}
          <br />
          <button className="primary" type="submit">{t.login}</button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button type="button" className="link" onClick={toggleLang}>{lang === 'en' ? 'বাংলা' : 'English'}</button>
          </div>
        </form>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="wrap">
        <div className="card">
          <div className="msg err">{error}</div>
          <br />
          <button className="primary" type="button" onClick={load}>{t.retry}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="top no-print">
        <h1>{settings.houseName ? `${settings.houseName} – ` : ''}{t.appTitle}</h1>
        <div className="top-actions">
          <button type="button" className="ghost" onClick={toggleLang}>{lang === 'en' ? 'বাংলা' : 'English'}</button>
          <button type="button" className="ghost" onClick={logout}>{t.logout}</button>
        </div>
      </header>

      {receipt ? (
        <Receipt rec={receipt} settings={settings} lang={lang} t={t} onClose={() => { setReceipt(null); changeMonth(form.month); }} />
      ) : null}

      <div className="card no-print">
        <div className="grid">
          <div className="full">
            <label htmlFor="month">{t.month}</label>
            <input id="month" type="month" value={form.month} onChange={(e) => changeMonth(e.target.value)} />
          </div>
          <div>
            <label htmlFor="old">{t.oldR}</label>
            <input id="old" type="number" inputMode="decimal" step="any" min="0" value={form.oldReading} onChange={(e) => setField('oldReading', e.target.value)} />
            {hint ? <div className="hint">{t.autoOld}</div> : null}
          </div>
          <div>
            <label htmlFor="new">{t.newR}</label>
            <input id="new" type="number" inputMode="decimal" step="any" min="0" value={form.newReading} onChange={(e) => setField('newReading', e.target.value)} />
          </div>
          <div>
            <label htmlFor="rent">{t.rent}</label>
            <input id="rent" type="number" inputMode="decimal" step="any" min="0" value={form.rent} onChange={(e) => setField('rent', e.target.value)} />
          </div>
          <div>
            <label htmlFor="gas">{t.gas}</label>
            <input id="gas" type="number" inputMode="decimal" step="any" min="0" value={form.gas} onChange={(e) => setField('gas', e.target.value)} />
          </div>
          <div>
            <label htmlFor="other">{t.other}</label>
            <input id="other" type="number" inputMode="decimal" step="any" min="0" value={form.other} onChange={(e) => setField('other', e.target.value)} />
          </div>
          <div>
            <label htmlFor="note">{t.note}</label>
            <input id="note" type="text" value={form.note} onChange={(e) => setField('note', e.target.value)} />
          </div>
        </div>

        {preview ? (
          <div className="preview">
            <div className="row"><span>{t.units}</span><b>{preview.units}</b></div>
            <div className="row"><span>{t.electricity}</span><span>{money(preview.electricity)}</span></div>
            <div className="row"><span>{t.vat} ({settings.vat}%)</span><span>{money(preview.vat)}</span></div>
            {preview.demand ? <div className="row"><span>{t.demand}</span><span>{money(preview.demand)}</span></div> : null}
            <div className="row total"><span>{t.total}</span><span>৳ {money(preview.total)}</span></div>
          </div>
        ) : null}

        {msg ? (
          <div className={`msg ${msg.kind}`}>
            {msg.text}
            {msg.replace ? <button type="button" onClick={() => generate(true)}>{t.replace}</button> : null}
          </div>
        ) : null}

        <br />
        <button className="primary" type="button" disabled={busy} onClick={() => generate(false)}>
          {busy ? t.generating : t.generate}
        </button>
        <div className="hint">{t.settingsHint}</div>
      </div>

      <div className="card no-print">
        <h2 style={{ fontSize: 16, margin: '0 0 10px 0' }}>{t.history}</h2>
        {yearTotals.length ? (
          <div className="years">
            {yearTotals.map(([y, total]) => (
              <span className="chip" key={y}>{y} {t.paid}: ৳ {money(total)}</span>
            ))}
          </div>
        ) : null}
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>{t.month}</th>
                <th className="num">{t.units}</th>
                <th className="num">{t.electricity}</th>
                <th className="num">{t.total}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={5}>{t.none}</td></tr>
              ) : (
                records.map((r) => (
                  <tr key={r.month}>
                    <td>{r.month}</td>
                    <td className="num">{r.units}</td>
                    <td className="num">{money(r.electricity)}</td>
                    <td className="num"><b>{money(r.total)}</b></td>
                    <td>
                      <button type="button" className="link" onClick={() => { setReceipt(r); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        {t.view}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
