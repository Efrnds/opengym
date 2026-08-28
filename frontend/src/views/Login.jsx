import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, passkeyRegister, BIO } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

const UP = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }
const T = i => ({ duration: 0.42, delay: i * 0.07, ease: [0.32, 0.72, 0, 1] })

function RegisterSheet({ close }) {
  const { setUser, pushState, pullState, loadConfig } = useStore()
  const config = useStore(s => s.config)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const inviteOnly = !!config?.invite_only
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  useEffect(() => { loadConfig() }, [loadConfig])
  const go = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { useUI.getState().toast(t('An invite code is required')); return }
    try {
      const u = await passkeyRegister(n, code.trim())
      setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); useUI.getState().toast(t('Profile created — data from this device moved into it')) }
      else { await pullState(); useUI.getState().toast(t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Registration failed')) }
  }
  return <>
    <h3>{t('Create your profile')}</h3>
    <p className="login-sheet-lead">{t('Pick a name, then confirm with {0}. The passkey is saved in your device — no password needed.', BIO)}</p>
    <input ref={ref} className="input" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} />
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
      <p className="login-sheet-hint">{t('This app is invite-only — enter the code you were given.')}</p>
    </>}
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}

function LoginBrand() {
  return (
    <motion.div className="login-brand" {...UP} transition={T(0)}>
      <motion.div
        className="login-logo"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <Icon name="dumbbell" />
      </motion.div>
      <h1 className="login-title">openGym</h1>
    </motion.div>
  )
}

export default function Login() {
  const { setUser, pullState, setGuest } = useStore()
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)
  const signIn = async () => {
    try { const u = await passkeyLogin(); setUser(u); await pullState(); useUI.getState().toast(t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Sign-in failed')) }
  }

  const shell = body => (
    <div className="login-v2">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-inner narrow">{body}</div>
    </div>
  )

  if (DEMO) return shell(<>
    <LoginBrand />
    <motion.p className="login-tagline" {...UP} transition={T(1)}>{t('Live demo — everything stays in this browser.')}</motion.p>
    <motion.div className="login-card" {...UP} transition={T(2)}>
      <Button variant="primary" icon="sparkles" onClick={() => setGuest(true)}>{t('Start the demo')}</Button>
    </motion.div>
    <motion.div className="login-note" {...UP} transition={T(3)}>
      {t('This demo runs entirely in your browser on example data — nothing is sent anywhere. Passkey sign-in and sync across your devices come with the openGym server, which you get by self-hosting it.')}
    </motion.div>
    <motion.p className="login-foot" {...UP} transition={T(4)}>
      <a href={REPO} target="_blank" rel="noopener">{t('Self-host it in a minute →')}</a>
    </motion.p>
  </>)

  return shell(<>
    <LoginBrand />
    <motion.p className="login-tagline" {...UP} transition={T(1)}>{t('Your workouts. Your weights. Your profile.')}</motion.p>
    <motion.div className="login-card" {...UP} transition={T(2)}>
      {webauthnOK() ? <>
        <Button variant="primary" icon="person" onClick={signIn}>{t('Sign in with passkey')}</Button>
        <div style={{ height: 10 }} />
        <Button icon="sparkles" onClick={() => useUI.getState().openSheet(close => <RegisterSheet close={close} />)}>{t('Create new profile')}</Button>
      </> : (
        <p className="login-note inline">{canGuest
          ? t("This browser doesn't support passkeys — you can still use openGym locally on this device.")
          : t("This browser doesn't support passkeys, and this instance requires an account. Try a browser or device with passkey support.")}</p>
      )}
      {canGuest && <>
        <div style={{ height: 10 }} />
        <Button variant="ghost" className="dim" onClick={() => setGuest(true)}>{t('Continue without account')}</Button>
      </>}
    </motion.div>
    <motion.p className="login-foot" {...UP} transition={T(3)}>
      {t('Passkeys use {0} — no passwords.', BIO)}<br />
      {t('Each profile keeps its own plan, workouts & body weight.')}
    </motion.p>
  </>)
}
