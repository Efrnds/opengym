import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { api } from '../lib/api.js'
import { CATEGORY_LABEL } from '../lib/diet.js'
import {
  buildSmartShoppingList, shoppingSharePayload, mergeShoppingLists, normalizeStockItem,
  shoppingChannel, DEFAULT_GUEST_PERMS, normalizeGuestPerms,
} from '../lib/shopping.js'
import { purchaseSheet, shoppingAddSheet, shoppingItemSheet } from '../diet-sheets.jsx'
import { confirmSheet } from '../sheets.jsx'
import { Button, TextField, Row, Switch } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { MOBILE } from '../lib/mobile.js'

function emptyShare() {
  return {
    code: null, pairedCode: null, role: null, members: 0, paired: false,
    partnerName: null, ownerName: null, guestName: null,
    guestPerms: { ...DEFAULT_GUEST_PERMS },
  }
}

function shoppingInviteLink(code) {
  const base = typeof location !== 'undefined' ? location.origin : ''
  return `${base}/shopping?join=${encodeURIComponent(code)}`
}

function shoppingInviteText(code) {
  return t('Join my shopping list on openGym with code {0}\n{1}', code, shoppingInviteLink(code))
}

async function nativeOrWebShare(text) {
  if (MOBILE) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title: t('Shopping'), text, dialogTitle: t('Share') })
      return 'shared'
    } catch (e) {
      if (e?.message === 'Share canceled' || e?.code === 'ABORT_ERROR') return 'abort'
    }
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      // Text only — so WhatsApp / Messages keep the code in the body (url-only drops it).
      await navigator.share({ title: t('Shopping'), text })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'abort'
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

function GuestPermsEditor({ perms, busy, onChange }) {
  const rows = [
    { key: 'canAdd', title: t('Add items'), subtitle: t('Guest can put new products on the list') },
    { key: 'canEdit', title: t('Edit items'), subtitle: t('Guest can change qty, name and barcode') },
    { key: 'canRemove', title: t('Remove items'), subtitle: t('Guest can delete lines from the list') },
    { key: 'canPurchase', title: t('Log purchases'), subtitle: t('Guest can mark items as bought') },
  ]
  return (
    <div className="shop-guest-perms">
      <p className="shop-guest-perms-title">{t('Guest permissions')}</p>
      {rows.map(row => (
        <Row key={row.key} title={row.title} subtitle={row.subtitle} className="shop-guest-perm-row">
          <Switch
            checked={!!perms[row.key]}
            disabled={busy}
            onChange={v => onChange({ ...perms, [row.key]: v })}
          />
        </Row>
      ))}
    </div>
  )
}

function guestPermSummary(perms) {
  const bits = []
  if (perms.canAdd) bits.push(t('add'))
  if (perms.canEdit) bits.push(t('edit'))
  if (perms.canRemove) bits.push(t('remove'))
  if (perms.canPurchase) bits.push(t('buy'))
  if (!bits.length) return t('View only — the host manages the list.')
  return t('You’re allowed to: {0}.', bits.join(', '))
}

export default function Shopping() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const toast = useUI(s => s.toast)
  const update = useStore(s => s.update)
  const user = useStore(s => s.user)
  const shoppingOn = useStore(s => s.S.useShoppingList !== false)
  const stock = useStore(s => s.S.stock || [])
  const extras = useStore(s => s.S.shoppingExtras || [])
  const share = useStore(s => s.S.shoppingShare || {})
  const [sharedLines, setSharedLines] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [permsOpen, setPermsOpen] = useState(false)
  const pendingJoinRef = useRef('')
  const autoJoinedRef = useRef('')

  const code = share.pairedCode || share.code
  const isHost = share.role === 'host' || (!!share.code && !share.pairedCode)
  const isGuest = share.role === 'guest' || !!share.pairedCode
  const paired = !!(share.paired || (share.members || 0) >= 2)
  const perms = normalizeGuestPerms(share.guestPerms)
  const canAdd = !isGuest || perms.canAdd
  const canEdit = !isGuest || perms.canEdit
  const canRemove = !isGuest || perms.canRemove
  const canPurchase = !isGuest || perms.canPurchase

  const clearShare = (msg) => {
    update(s => { s.shoppingShare = emptyShare() })
    setSharedLines(null)
    if (msg) toast(msg)
  }

  const applyRemote = lines => {
    setSharedLines((Array.isArray(lines) ? lines : []).map(l => {
      const category = l.category || 'PANTRY'
      const qty = Number(l.qty || l.deficit) || 0
      return {
        ...l,
        name: l.name || 'Item',
        category,
        unit: l.unit || 'un',
        qty,
        deficit: qty,
        channel: l.channel || shoppingChannel(category),
        source: l.source === 'manual' ? 'manual' : 'auto',
        barcode: l.barcode || '',
      }
    }))
  }

  const applyShareMeta = r => {
    if (!r || !r.code) return
    const role = r.role === 'host' ? 'host' : 'guest'
    update(s => {
      s.shoppingShare = {
        ...(s.shoppingShare || {}),
        code: role === 'host' ? r.code : null,
        pairedCode: role === 'guest' ? r.code : null,
        role,
        members: Number(r.members) || 0,
        paired: !!r.paired || (Number(r.members) || 0) >= 2,
        partnerName: r.partnerName || null,
        ownerName: r.ownerName || null,
        guestName: r.guestName || null,
        guestPerms: normalizeGuestPerms(r.guestPerms),
        householdWeeklyPrep: r.weeklyPrep || null,
      }
      if (Array.isArray(r.stock) && r.stock.length > 0) {
        if (role === 'guest' || (s.stock || []).length === 0) {
          s.stock = r.stock
        }
      }
    })
    if (Array.isArray(r.lines)) applyRemote(r.lines)
  }

  const localLinesPayload = () => {
    const st = useStore.getState().S
    const role = st.shoppingShare?.role
    const p = normalizeGuestPerms(st.shoppingShare?.guestPerms)
    const activePrep = (st.weeklyMealPrep || []).find(x => x.isActive)
    // Guests without canAdd must not push local extras into the household list.
    if (role === 'guest' && !p.canAdd) return { lines: [], stock: st.stock || [], weeklyPrep: activePrep }
    return {
      ...shoppingSharePayload(
        st.stock || [],
        st.shoppingExtras || [],
        st.useShoppingList !== false,
        activePrep,
      ),
      stock: st.stock || [],
    }
  }

  // Share sync is driven globally by useHouseholdShareSync in App.jsx.

  // Capture ?join= from the invite link (even before auth hydrates).
  useEffect(() => {
    const join = String(params.get('join') || '').trim().toUpperCase()
    if (!join) return
    setJoinCode(join)
    pendingJoinRef.current = join
    const next = new URLSearchParams(params)
    next.delete('join')
    setParams(next, { replace: true })
  }, [params, setParams])

  const joinShare = async (forced) => {
    if (!user) { toast(t('Sign in to share a shopping list')); return false }
    const c = String(forced || joinCode).trim().toUpperCase()
    if (!c) { toast(t('Enter a partner code')); return false }
    setBusy(true)
    try {
      const payload = localLinesPayload()
      const r = await api('/api/shopping/share/join', {
        method: 'POST',
        body: JSON.stringify({ code: c, lines: payload.lines, weeklyPrep: payload.weeklyPrep }),
      })
      applyShareMeta(r)
      setJoinCode('')
      toast(r.paired ? t('Connected with {0}', r.partnerName || r.ownerName || c) : t('Lists merged'))
      return true
    } catch (e) {
      toast(e.message || t('Could not join list'))
      return false
    } finally {
      setBusy(false)
    }
  }

  // Auto-join after sign-in when the invite code was in the URL.
  useEffect(() => {
    const c = pendingJoinRef.current
    if (!user || !c || autoJoinedRef.current === c) return
    autoJoinedRef.current = c
    pendingJoinRef.current = ''
    joinShare(c)
  }, [user])

  const local = buildSmartShoppingList(stock, extras, shoppingOn, useStore.getState().S.shoppingIgnored || [])
  // Guest without canAdd: show household list only (host-driven).
  const list = code
    ? mergeShoppingLists(isGuest && !perms.canAdd ? [] : local, sharedLines || [])
    : local
  const market = list.filter(l => l.channel === 'MARKET')
  const fair = list.filter(l => l.channel === 'FAIR')
  const total = list.reduce((n, l) => n + (l.cost || 0), 0)

  const removeLine = async line => {
    if (!canRemove) { toast(t('The host didn’t allow removing items')); return }
    if (code) {
      try {
        const r = await api('/api/shopping/share/join', {
          method: 'POST',
          body: JSON.stringify({ code, action: { type: 'remove', line } }),
        })
        applyShareMeta(r)
      } catch (e) {
        // Continue to local remove
      }
    }
    update(s => {
      if (line.source !== 'manual' && !line.stockId) {
        s.shoppingIgnored = [...(s.shoppingIgnored || []), line.id]
      }
      if (line.source === 'manual') {
        s.shoppingExtras = (s.shoppingExtras || []).filter(x => x.id !== line.id)
        return
      }
      const id = line.stockId || line.id
      s.stock = (s.stock || []).map(item => item.id === id
        ? normalizeStockItem({ ...item, minAlertQty: 0 })
        : item)
    })
    toast(t('Removed from list'))
  }

  const shareInvite = async (value) => {
    const result = await nativeOrWebShare(shoppingInviteText(value))
    if (result === 'copied') toast(t('Invite copied'))
    else if (result === 'failed') toast(shoppingInviteText(value))
  }

  const leaveShare = () => {
    confirmSheet({
      title: t('Leave shared list?'),
      message: t('You can create or join a new code afterwards.'),
      confirmText: t('Leave'),
      danger: true,
      onConfirm: () => clearShare(t('Left the shared list')),
    })
  }

  const publishShare = async () => {
    if (!user) { toast(t('Sign in to share a shopping list')); return }
    setBusy(true)
    try {
      const payload = localLinesPayload()
      const r = await api('/api/shopping/share', {
        method: 'POST',
        body: JSON.stringify({
          lines: payload.lines,
          stock: payload.stock,
          guestPerms: share.guestPerms,
          weeklyPrep: payload.weeklyPrep,
        }),
      })
      applyShareMeta(r)
      toast(t('Share code: {0}', r.code))
    } catch (e) {
      toast(e.message || t('Could not share list'))
    } finally {
      setBusy(false)
    }
  }

  const refreshShare = async () => {
    if (!user || !code) return
    setBusy(true)
    try {
      const payload = localLinesPayload()
      const r = await api('/api/shopping/share/join', {
        method: 'POST',
        body: JSON.stringify({ code, lines: payload.lines }),
      })
      applyShareMeta(r)
      toast(r.paired
        ? t('Connected with {0}', r.partnerName || t('partner'))
        : t('List updated'))
    } catch (e) {
      if (e?.status === 404 || e?.status === 403) {
        clearShare(t('Share expired — create or join a new code'))
      } else {
        toast(e.message || t('Could not refresh list'))
      }
    } finally {
      setBusy(false)
    }
  }

  const saveGuestPerms = async (next) => {
    if (!user || !code || !isHost) return
    const prev = perms
    update(s => {
      s.shoppingShare = { ...(s.shoppingShare || {}), guestPerms: normalizeGuestPerms(next) }
    })
    setBusy(true)
    try {
      const r = await api('/api/shopping/share/perms', {
        method: 'POST',
        body: JSON.stringify({ code, guestPerms: normalizeGuestPerms(next) }),
      })
      applyShareMeta(r)
    } catch (e) {
      update(s => {
        s.shoppingShare = { ...(s.shoppingShare || {}), guestPerms: prev }
      })
      toast(e.message || t('Could not update permissions'))
    } finally {
      setBusy(false)
    }
  }

  const onAdd = () => {
    if (!canAdd) { toast(t('The host didn’t allow adding items')); return }
    shoppingAddSheet()
  }

  const onEdit = (line) => {
    if (!canEdit) { toast(t('The host didn’t allow editing items')); return }
    shoppingItemSheet(line)
  }

  const onPurchase = (line) => {
    if (!canPurchase) { toast(t('The host didn’t allow logging purchases')); return }
    purchaseSheet(line)
  }

  const Group = ({ title, rows }) => (
    <section className="card">
      <h2>{title}</h2>
      {rows.length === 0 && <p className="muted small">{t('Nothing to buy')}</p>}
      {rows.map(l => (
        <div key={l.id || l.name + l.unit} className="lrow shop-line">
          <button
            type="button"
            className="shop-line-main"
            onClick={() => onPurchase(l)}
            disabled={!canPurchase}
          >
            <span className="lrow-m">
              <span className="lrow-t">{l.name}</span>
              <span className="lrow-s">
                {t(CATEGORY_LABEL[l.category] || l.category)} · +{l.qty || l.deficit} {l.unit}
                {l.barcode ? ` · ${l.barcode}` : ''}
                {l.source === 'manual' ? ' · ' + t('Extra') : ''}
              </span>
            </span>
            {(l.cost > 0) && <span className="lrow-v">{Number(l.cost).toFixed(2)}</span>}
            {canPurchase && <span className="shop-line-buy">{t('Log purchase')}</span>}
          </button>
          {(canEdit || canRemove) && (
            <div className="shop-line-acts">
              {canEdit && (
                <>
                  <button type="button" className="iconbtn" aria-label={t('Edit')} onClick={() => onEdit(l)}>
                    <Icon name="pencil" />
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label={t('Scan barcode')}
                    onClick={() => onEdit(l)}
                    title={t('Barcode')}
                  >
                    <Icon name="qrcode" />
                  </button>
                </>
              )}
              {canRemove && (
                <button
                  type="button"
                  className="iconbtn"
                  aria-label={t('Delete')}
                  onClick={() => confirmSheet({
                    title: t('Remove from list?'),
                    message: t('“{0}” will leave the shopping list.', l.name),
                    confirmText: t('Remove'),
                    danger: true,
                    onConfirm: () => removeLine(l),
                  })}
                >
                  <Icon name="trash" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  )

  return (
    <div className="narrow diet-page">
      <header className="home-top">
        <div>
          <button type="button" className="iconbtn" onClick={() => nav('/diet?tab=stock')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
          <p className="home-greet">{t('Shopping')}</p>
          <p className="home-date">{list.length}{total > 0 ? ' · ' + total.toFixed(2) : ''}</p>
        </div>
        {canAdd && (
          <Button size="sm" variant="primary" icon="plus" onClick={onAdd}>{t('Add')}</Button>
        )}
      </header>

      <div className="shopping-desktop-layout">
        <div className="shopping-side-col">
          {!shoppingOn && (
            <section className="card">
              <p className="muted small">{t('Shopping list is off. Turn it on in Stock to use this as your pantry entry.')}</p>
              <Button size="sm" variant="tinted" onClick={() => nav('/diet?tab=stock')}>{t('Open pantry')}</Button>
            </section>
          )}

          <section className="card shop-share">
            <h2>{t('Shared list')}</h2>
            {!user && (
              <p className="muted small">{t('Sign in to share a shopping list')}</p>
            )}

            {paired ? (
              <div className="shop-paired">
                <p className="shop-paired-badge">
                  {isGuest
                    ? t('You’re a guest on this list')
                    : t('You’re the host of this list')}
                </p>
                <div className="shop-paired-head">
                  <p className="shop-paired-with">
                    {share.partnerName
                      ? t('Connected with {0}', share.partnerName)
                      : t('Connected with your partner')}
                  </p>
                  {isHost && (
                    <button
                      type="button"
                      className={'iconbtn shop-perms-btn' + (permsOpen ? ' on' : '')}
                      aria-label={t('Guest permissions')}
                      aria-expanded={permsOpen}
                      title={t('Guest permissions')}
                      onClick={() => setPermsOpen(v => !v)}
                    >
                      <Icon name="lock" />
                    </button>
                  )}
                </div>
                <p className="muted small">
                  {isGuest
                    ? guestPermSummary(perms)
                    : t('Your partner already joined — no need to invite again.')}
                </p>
                {isHost && permsOpen && (
                  <GuestPermsEditor perms={perms} busy={busy} onChange={saveGuestPerms} />
                )}
                <div className="shop-share-acts">
                  <Button size="sm" variant="tinted" disabled={busy} onClick={refreshShare}>{t('Refresh')}</Button>
                  <Button size="sm" variant="plain" disabled={busy} onClick={leaveShare}>{t('Leave')}</Button>
                </div>
              </div>
            ) : code && isHost ? (
              <>
                <div className="shop-paired-head">
                  <p className="muted small shop-paired-wait">{t('Waiting for your partner to join with this code.')}</p>
                  <button
                    type="button"
                    className={'iconbtn shop-perms-btn' + (permsOpen ? ' on' : '')}
                    aria-label={t('Guest permissions')}
                    aria-expanded={permsOpen}
                    title={t('Guest permissions')}
                    onClick={() => setPermsOpen(v => !v)}
                  >
                    <Icon name="lock" />
                  </button>
                </div>
                <div className="shop-share-code">
                  <span className="shop-share-code-val">{code}</span>
                </div>
                <div className="shop-share-acts">
                  <Button size="sm" variant="primary" onClick={() => shareInvite(code)}>{t('Share')}</Button>
                  <Button size="sm" variant="tinted" disabled={busy} onClick={refreshShare}>{t('Refresh')}</Button>
                  <Button size="sm" variant="plain" disabled={busy} onClick={leaveShare}>{t('Leave')}</Button>
                </div>
                {permsOpen && (
                  <GuestPermsEditor perms={perms} busy={busy} onChange={saveGuestPerms} />
                )}
              </>
            ) : code && isGuest ? (
              <div className="shop-paired">
                <p className="shop-paired-badge">{t('You’re a guest on this list')}</p>
                <p className="shop-paired-with">
                  {share.ownerName || share.partnerName
                    ? t('Connected with {0}', share.ownerName || share.partnerName)
                    : t('Connected with your partner')}
                </p>
                <p className="muted small">{guestPermSummary(perms)}</p>
                <div className="shop-share-acts">
                  <Button size="sm" variant="tinted" disabled={busy} onClick={refreshShare}>{t('Refresh')}</Button>
                  <Button size="sm" variant="plain" disabled={busy} onClick={leaveShare}>{t('Leave')}</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="muted small">{t('Pair with one household partner via a short code.')}</p>
                <Button size="sm" variant="primary" disabled={busy || !user} onClick={publishShare}>{t('Create share code')}</Button>
                <div className="shop-share-join">
                  <TextField
                    value={joinCode}
                    placeholder={t('Partner code')}
                    maxLength={12}
                    autoCapitalize="characters"
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  />
                  <Button size="sm" variant="tinted" disabled={busy || !user} onClick={() => joinShare()}>{t('Join')}</Button>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="shopping-main-col">
          {list.length === 0 && (
            <section className="card">
              <p className="muted small">
                {shoppingOn
                  ? (isGuest && !perms.canAdd
                    ? t('Nothing on the shared list yet.')
                    : t('Nothing on the list yet. Tap Add to buy and restock.'))
                  : t('Shopping list is off. Turn it on in Stock, or add one-off items above.')}
              </p>
            </section>
          )}
          {list.length > 0 && <>
            <Group title={t('Supermarket')} rows={market} />
            <Group title={t('Street market')} rows={fair} />
          </>}
        </div>
      </div>
    </div>
  )
}
