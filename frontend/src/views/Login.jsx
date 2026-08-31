import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, passkeyRegister, passwordLogin, passwordRegister, BIO } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

const FADE = { initial: { opacity: 0 }, animate: { opacity: 1 } }
const T = { duration: 0.32, ease: [0.32, 0.72, 0, 1] }

function RegisterSheet({ close }) {
  const { setUser, pushState, pullState, loadConfig } = useStore()
  const config = useStore(s => s.config)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState('password') // 'password' | 'passkey'
  const [busy, setBusy] = useState(false)
  const inviteOnly = !!config?.invite_only
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  useEffect(() => { loadConfig() }, [loadConfig])

  const finish = async (u) => {
    setUser(u); close()
    if (hasData(useStore.getState().S)) { await pushState(); useUI.getState().toast(t('Profile created — data from this device moved into it')) }
    else { await pullState(); useUI.getState().toast(t('Welcome, {0}', u.name)) }
  }

  const goPassword = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (!email.trim()) { useUI.getState().toast(t('Enter your email')); return }
    if (password.length < 8) { useUI.getState().toast(t('Password must be at least 8 characters')); return }
    if (inviteOnly && !code.trim()) { useUI.getState().toast(t('An invite code is required')); return }
    setBusy(true)
    try {
      const u = await passwordRegister({ name: n, email, password, code: code.trim() })
      await finish(u)
    } catch (e) { useUI.getState().toast(e.message || t('Registration failed')) }
    finally { setBusy(false) }
  }

  const goPasskey = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { useUI.getState().toast(t('An invite code is required')); return }
    setBusy(true)
    try {
      const u = await passkeyRegister(n, code.trim())
      await finish(u)
    } catch (e) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Registration failed'))
    } finally { setBusy(false) }
  }

  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="login-auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={mode === 'password'} className={mode === 'password' ? 'on' : ''} onClick={() => setMode('password')}>{t('Email & password')}</button>
      {webauthnOK() && <button type="button" role="tab" aria-selected={mode === 'passkey'} className={mode === 'passkey' ? 'on' : ''} onClick={() => setMode('passkey')}>{t('Passkey')}</button>}
    </div>
    <p className="login-sheet-lead">{mode === 'password'
      ? t('Choose a name, email and password. You can sign in from any device.')
      : t('Pick a name, then confirm with {0}. The passkey is saved in your device — no password needed.', BIO)}</p>
    <input ref={ref} className="input" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" />
    {mode === 'password' && <>
      <div style={{ height: 10 }} />
      <input className="input" type="email" placeholder={t('Email')} maxLength={120} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
      <div style={{ height: 10 }} />
      <input className="input" type="password" placeholder={t('Password')} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
    </>}
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
      <p className="login-sheet-hint">{t('This app is invite-only — enter the code you were given.')}</p>
    </>}
    <div style={{ height: 12 }} />
    <Button variant="primary" disabled={busy} onClick={mode === 'password' ? goPassword : goPasskey}>
      {mode === 'password' ? t('Create account') : t('Create passkey')}
    </Button>
  </>
}

function LoginBrand() {
  return (
    <div className="login-brand">
      <div className="login-logo"><Icon name="dumbbell" /></div>
      <h1 className="login-title">openGym</h1>
    </div>
  )
}

export default function Login() {
  const { setUser, pullState, setGuest } = useStore()
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const signInPassword = async (e) => {
    e?.preventDefault?.()
    if (!email.trim() || !password) { useUI.getState().toast(t('Enter email and password')); return }
    setBusy(true)
    try {
      const u = await passwordLogin({ email, password })
      setUser(u); await pullState(); useUI.getState().toast(t('Welcome back, {0}', u.name))
    } catch (err) { useUI.getState().toast(err.message || t('Sign-in failed')) }
    finally { setBusy(false) }
  }

  const signInPasskey = async () => {
    try { const u = await passkeyLogin(); setUser(u); await pullState(); useUI.getState().toast(t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Sign-in failed')) }
  }

  const shell = body => (
    <div className="login-v2">
      <div className="login-glow" aria-hidden="true" />
      <motion.div className="login-inner narrow" {...FADE} transition={T}>{body}</motion.div>
    </div>
  )

  if (DEMO) return shell(<>
    <LoginBrand />
    <p className="login-tagline">{t('Live demo — everything stays in this browser.')}</p>
    <div className="login-card">
      <Button variant="primary" icon="sparkles" onClick={() => setGuest(true)}>{t('Start the demo')}</Button>
    </div>
    <div className="login-note">
      {t('This demo runs entirely in your browser on example data — nothing is sent anywhere. Passkey sign-in and sync across your devices come with the openGym server, which you get by self-hosting it.')}
    </div>
    <p className="login-foot">
      <a href={REPO} target="_blank" rel="noopener">{t('Self-host it in a minute →')}</a>
    </p>
  </>)

  return shell(<>
    <LoginBrand />
    <p className="login-tagline">{t('Your workouts. Your weights. Your profile.')}</p>
    <div className="login-card">
      <form onSubmit={signInPassword}>
        <input className="input" type="email" placeholder={t('Email')} maxLength={120} value={email}
          onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        <div style={{ height: 10 }} />
        <input className="input" type="password" placeholder={t('Password')} maxLength={128} value={password}
          onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        <div style={{ height: 12 }} />
        <Button variant="primary" type="submit" disabled={busy}>{t('Sign in')}</Button>
      </form>
      <div style={{ height: 10 }} />
      <Button icon="sparkles" disabled={busy} onClick={() => useUI.getState().openSheet(close => <RegisterSheet close={close} />)}>{t('Create new profile')}</Button>
      {webauthnOK() && <>
        <div className="login-or"><span>{t('or')}</span></div>
        <Button variant="ghost" icon="person" disabled={busy} onClick={signInPasskey}>{t('Sign in with passkey')}</Button>
      </>}
      {canGuest && <>
        <div style={{ height: 10 }} />
        <Button variant="ghost" className="dim" onClick={() => setGuest(true)}>{t('Continue without account')}</Button>
      </>}
    </div>
    <p className="login-foot">
      {t('Sign in with email, or use a passkey if you prefer.')}<br />
      {t('Each profile keeps its own plan, workouts & body weight.')}
    </p>
  </>)
}
