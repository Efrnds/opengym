import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { todayISO, uid, fmtDate, fmtNum } from '../lib/format.js'
import { Button, NumberField, TextArea } from '../components/ui.jsx'
import { confirmSheet, bwSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'

function readPic(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const max = 480
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = reject
    img.src = url
  })
}

function Pic({ label, value, onChange }) {
  return (
    <label className="diet-pic">
      {value ? <img src={value} alt={label} /> : <span>{label}</span>}
      <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async e => {
        const f = e.target.files?.[0]
        if (f) onChange(await readPic(f))
      }} />
    </label>
  )
}

export default function Vault() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const last = S.bodyweight.at(-1)?.w || 0
  const [weight, setWeight] = useState(last || 0)
  const [notes, setNotes] = useState('')
  const [front, setFront] = useState('')
  const [side, setSide] = useState('')
  const [back, setBack] = useState('')
  const checks = [...(S.vaultChecks || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const save = () => {
    const date = todayISO()
    const w = weight || last
    update(st => {
      if (w) {
        const entry = st.bodyweight.find(b => b.d === date)
        if (entry) { entry.w = w; entry.t = Date.now() }
        else st.bodyweight = [...st.bodyweight, { d: date, w, t: Date.now() }].sort((a, b) => (a.d < b.d ? -1 : 1))
      }
      if (front || side || back || notes.trim()) {
        st.vaultChecks = [{ id: uid(), date, weightKg: w || 0, notes, front, side, back }, ...st.vaultChecks]
      }
    })
    setNotes(''); setFront(''); setSide(''); setBack('')
    toast(t('Saved'))
  }

  return (
    <div className="narrow diet-page">
      <header className="home-top">
        <div>
          <button type="button" className="iconbtn" onClick={() => nav('/home')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
          <p className="home-greet">{t('Progress')}</p>
          <p className="home-date">{t('Weight and optional photos')}</p>
        </div>
      </header>

      <section className="card">
        <div className="row between">
          <h2>{t('Body weight')}</h2>
          <Button size="sm" onClick={() => bwSheet()}>{t('Log')}</Button>
        </div>
        <div className="diet-field">
          <span className="diet-field-lbl">{t('Body weight')} ({S.unit})</span>
          <NumberField value={weight} onChange={setWeight} />
        </div>
        <Button variant="primary" onClick={save}>{t('Save weight')}</Button>
      </section>

      <section className="card">
        <h2>{t('Photos')}</h2>
        <p className="muted small">{t('Optional. Front / side / back, stored on this profile.')}</p>
        <div className="diet-pics">
          <Pic label={t('Front')} value={front} onChange={setFront} />
          <Pic label={t('Side')} value={side} onChange={setSide} />
          <Pic label={t('Back photo')} value={back} onChange={setBack} />
        </div>
        <TextArea value={notes} placeholder={t('Notes')} onChange={e => setNotes(e.target.value)} />
        <div style={{ height: 10 }} />
        <Button onClick={save}>{t('Save check')}</Button>
      </section>

      {checks.map(c => (
        <section key={c.id} className="card">
          <div className="row between">
            <h2>{fmtDate(c.date, true)} · {fmtNum(c.weightKg)} {S.unit}</h2>
            <button type="button" className="iconbtn" onClick={() => confirmSheet({
              title: t('Delete this check?'), danger: true, confirmText: t('Delete'),
              onConfirm: () => update(s => { s.vaultChecks = s.vaultChecks.filter(x => x.id !== c.id) }),
            })} aria-label={t('Delete')}><Icon name="trash" /></button>
          </div>
          <div className="diet-pics">
            {c.front && <img src={c.front} alt="" />}
            {c.side && <img src={c.side} alt="" />}
            {c.back && <img src={c.back} alt="" />}
          </div>
          {c.notes ? <p className="muted small">{c.notes}</p> : null}
        </section>
      ))}
    </div>
  )
}
