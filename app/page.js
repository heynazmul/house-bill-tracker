'use client';

import { useEffect, useMemo, useState } from 'react';
import { calcMemo } from '../lib/calc';
import { RATE } from '../lib/config';
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
const newestFirst = (list) => [...list].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));

// What the form should show for a month: the saved memo, or a fresh one with the old reading carried over.
function formFor(month, memos, settings) {
  const existing = memos.find((m) => m.month === month);
  if (existing) {
    return {
      hint: false,
      form: {
        month,
        oldReading: String(existing.oldReading),
        newReading: String(existing.newReading),
        rent: String(existing.rent),
      },
    };
  }
  const prev = memos.find((m) => m.month < month); // memos are newest first
  return {
    hint: Boolean(prev),
    form: {
      month,
      oldReading: prev ? String(prev.newReading) : '',
      newReading: '',
      rent: String(settings.rent),
    },
  };
}

function Memo({ memo, settings, lang, t, onClose }) {
  const today = new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const label = monthLabel(memo.month, lang);

  const print = () => {
    const old = document.title;
    document.title = memo.memoNo; // becomes the default PDF file name
    window.print();
    setTimeout(() => {
      document.title = old;
    }, 1500);
  };

  const wa = `https://wa.me/?text=${encodeURIComponent(
    `${memo.memoNo} | ${label} | ${t.total}: ৳${money(memo.total)}`
  )}`;

  return (
    <div>
      <div className="memo" id="memo">
        <h2>{settings.houseName || t.memoTitle}</h2>
        {settings.houseName ? <div className="sub">{t.memoTitle}</div> : null}
        <div className="meta">
          <span><b>{t.memoNo}:</b> {memo.memoNo}</span>
          <span><b>{t.month}:</b> {label}</span>
        </div>
        {settings.person ? (
          <div className="meta"><span><b>{t.name}:</b> {settings.person}</span></div>
        ) : null}

        <div className="sec">{t.meter}</div>
        <div className="row"><span>{t.oldShort}</span><span>{memo.oldReading}</span></div>
        <div className="row"><span>{t.newShort}</span><span>{memo.newReading}</span></div>
        <div className="row"><b>{t.units}</b><b>{memo.units}</b></div>

        <div className="sec">{t.charges}</div>
        <div className="row">
          <span>{t.electricity} ({memo.units} × {memo.rate} {t.perUnit})</span>
          <span>{money(memo.electricity)}</span>
        </div>
        <div className="row"><span>{t.houseRent}</span><span>{money(memo.rent)}</span></div>
        <div className="row total"><span>{t.total}</span><span>৳ {money(memo.total)}</span></div>

        <div className="foot"><span>{t.date}: {today}</span><span>{t.thanks}</span></div>
      </div>

      <div className="memo-actions no-print">
        <button type="button" onClick={print}>{t.print}</button>
        <a className="wa" href={wa} target="_blank" rel="noopener noreferrer">{t.whatsapp}</a>
        <button type="button" className="alt" onClick={onClose}>{t.close}</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState('en');
  const [phase, setPhase] = useState('loading'); // loading | login | ready | error
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({ houseName: '', person: '', rent: 8080 });
  const [memos, setMemos] = useState([]);
  const [form, setForm] = useState(null);
  const [hint, setHint] = useState(false);
  const [msg, setMsg] = useState(null); // { kind, text, replace? }
  const [busy, setBusy] = useState(false);
  const [memo, setMemo] = useState(null);
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState(null); // settings form
  const [setMsgText, setSetMsgText] = useState('');
  const t = T[lang];

  useEffect(() => {
    try {
      const l = localStorage.getItem('hbt_lang');
      if (l === 'bn' || l === 'en') setLang(l);
    } catch {}
    load();
  }, []);

  function applyData(d, month) {
    const list = newestFirst(d.memos);
    const f = formFor(month || thisMonth(), list, d.settings);
    setMemos(list);
    setSettings(d.settings);
    setDraft({ houseName: d.settings.houseName, person: d.settings.person, rent: String(d.settings.rent) });
    setForm(f.form);
    setHint(f.hint);
  }

  async function load() {
    setPhase('loading');
    setError('');
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.status === 401) return setPhase('login');
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not load data.');
      applyData(d);
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
    if (!res.ok) return setError(t.wrongPassword);
    setPassword('');
    load();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    setMemo(null);
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
    const f = formFor(m || thisMonth(), memos, settings);
    setForm(f.form);
    setHint(f.hint);
    setMsg(null);
  }

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const preview = useMemo(() => {
    if (!form) return null;
    const o = parseFloat(form.oldReading);
    const n = parseFloat(form.newReading);
    if (Number.isNaN(o) || Number.isNaN(n) || n < o) return null;
    return calcMemo({ oldReading: o, newReading: n, rent: parseFloat(form.rent) || 0 });
  }, [form]);

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
      if (res.status === 401) return setPhase('login');
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save.');
      if (d.status === 'exists') return setMsg({ kind: 'warn', text: t.exists, replace: true });
      applyData(d, form.month);
      setHint(false);
      setMemo(d.memo);
      setMsg({ kind: 'ok', text: t.saved });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(month) {
    if (!window.confirm(t.confirmDel)) return;
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not delete.');
      if (memo && memo.month === month) setMemo(null);
      applyData(d, form.month);
    } catch (e) {
      setMsg({ kind: 'err', text: e.message });
    }
  }

  async function saveSettings() {
    setSetMsgText('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save settings.');
      applyData(d, form.month);
      setSetMsgText(t.settingsSaved);
    } catch (e) {
      setSetMsgText(e.message);
    }
  }

  function downloadCsv() {
    const head = ['Memo No', 'Month', 'Old Reading', 'New Reading', 'Units', 'Rate', 'Electricity', 'House Rent', 'Total'];
    const rows = [...memos].reverse().map((m) =>
      [m.memoNo, m.month, m.oldReading, m.newReading, m.units, m.rate, m.electricity, m.rent, m.total].join(',')
    );
    const blob = new Blob(['﻿' + head.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'house-bills.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const yearTotals = useMemo(() => {
    const totals = {};
    memos.forEach((m) => {
      const y = m.month.slice(0, 4);
      totals[y] = (totals[y] || 0) + m.total;
    });
    return Object.keys(totals).sort().reverse().map((y) => [y, totals[y]]);
  }, [memos]);

  /* ---------- Screens ---------- */

  if (phase === 'loading') return <div className="wrap"><p className="muted">{t.loading}</p></div>;

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
          <div className="msg err" style={{ marginTop: 0 }}>{error}</div>
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

      {memo ? <Memo memo={memo} settings={settings} lang={lang} t={t} onClose={() => setMemo(null)} /> : null}

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
          <div className="full">
            <label htmlFor="rent">{t.rent}</label>
            <input id="rent" type="number" inputMode="decimal" step="any" min="0" value={form.rent} onChange={(e) => setField('rent', e.target.value)} />
            <div className="hint">{t.rateHint}</div>
          </div>
        </div>

        {preview ? (
          <div className="preview" id="preview">
            <div className="row"><span>{t.units}</span><b>{preview.units}</b></div>
            <div className="row"><span>{t.electricity} ({preview.units} × {RATE})</span><span>{money(preview.electricity)}</span></div>
            <div className="row"><span>{t.houseRent}</span><span>{money(parseFloat(form.rent) || 0)}</span></div>
            <div className="row total"><span>{t.total}</span><span>৳ {money(preview.total)}</span></div>
          </div>
        ) : null}

        {msg ? (
          <div className={`msg ${msg.kind}`} id="msg">
            {msg.text}
            {msg.replace ? <button type="button" onClick={() => generate(true)}>{t.replace}</button> : null}
          </div>
        ) : null}

        <br />
        <button className="primary" id="gen" type="button" disabled={busy} onClick={() => generate(false)}>
          {busy ? t.generating : t.generate}
        </button>
      </div>

      <div className="card no-print">
        <h2 style={{ fontSize: 16, margin: '0 0 10px 0' }}>{t.history}</h2>
        {yearTotals.length ? (
          <div className="years" id="years">
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
            <tbody id="hist">
              {memos.length === 0 ? (
                <tr><td colSpan={5}>{t.none}</td></tr>
              ) : (
                memos.map((m) => (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td className="num">{m.units}</td>
                    <td className="num">{money(m.electricity)}</td>
                    <td className="num"><b>{money(m.total)}</b></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="link" data-view={m.month} onClick={() => { changeMonth(m.month); setMemo(m); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t.view}</button>
                      <button type="button" className="link danger" data-del={m.month} onClick={() => remove(m.month)}>{t.del}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="tools">
          <button type="button" className="ghost" onClick={downloadCsv}>{t.csv}</button>
        </div>
      </div>

      <div className="card no-print">
        <details>
          <summary>{t.settings}</summary>
          <br />
          <div className="grid">
            <div>
              <label htmlFor="sHouse">{t.house}</label>
              <input id="sHouse" type="text" value={draft.houseName} onChange={(e) => setDraft({ ...draft, houseName: e.target.value })} />
            </div>
            <div>
              <label htmlFor="sPerson">{t.person}</label>
              <input id="sPerson" type="text" value={draft.person} onChange={(e) => setDraft({ ...draft, person: e.target.value })} />
            </div>
            <div className="full">
              <label htmlFor="sRent">{t.defRent}</label>
              <input id="sRent" type="number" step="any" min="0" value={draft.rent} onChange={(e) => setDraft({ ...draft, rent: e.target.value })} />
            </div>
          </div>
          <div className="tools">
            <button type="button" className="ghost" id="saveSettings" onClick={saveSettings}>{t.saveSettings}</button>
          </div>
          {setMsgText ? <div className="msg ok" id="setMsg">{setMsgText}</div> : null}
        </details>
      </div>
    </div>
  );
}
