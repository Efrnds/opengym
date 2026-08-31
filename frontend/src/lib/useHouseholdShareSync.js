import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore.js'
import { api } from './api.js'
import { shoppingSharePayload, normalizeGuestPerms } from './shopping.js'

export function useHouseholdShareSync() {
  const user = useStore(s => s.user)
  const share = useStore(s => s.S.shoppingShare || {})
  const code = share.pairedCode || share.code
  const update = useStore(s => s.update)

  const lastServerSnapshotRef = useRef('')
  const isSyncingRef = useRef(false)

  const localPayload = () => {
    const st = useStore.getState().S
    const role = st.shoppingShare?.role
    const p = normalizeGuestPerms(st.shoppingShare?.guestPerms)
    const activePrep = (st.weeklyMealPrep || []).find(x => x.isActive)
    if (role === 'guest' && !p.canAdd) {
      return { lines: [], stock: st.stock || [], recipes: st.recipes || [], weeklyPrep: activePrep }
    }
    return {
      ...shoppingSharePayload(
        st.stock || [],
        st.shoppingExtras || [],
        st.useShoppingList !== false,
        activePrep,
      ),
      stock: st.stock || [],
      recipes: st.recipes || [],
    }
  }

  const applyShareMeta = r => {
    if (!r || !r.code) return
    const role = r.role === 'host' ? 'host' : 'guest'
    const snap = JSON.stringify({
      code: r.code,
      members: r.members,
      partnerName: r.partnerName,
      perms: r.guestPerms,
      prep: r.weeklyPrep,
      stock: r.stock,
      recipes: r.recipes,
      lines: r.lines,
    })

    if (lastServerSnapshotRef.current === snap) return
    lastServerSnapshotRef.current = snap

    const cur = useStore.getState().S
    const nextShare = {
      ...(cur.shoppingShare || {}),
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

    const shareChanged = JSON.stringify(cur.shoppingShare) !== JSON.stringify(nextShare)
    const stockChanged = role === 'guest' && Array.isArray(r.stock) && JSON.stringify(cur.stock || []) !== JSON.stringify(r.stock)
    const recipesChanged = role === 'guest' && Array.isArray(r.recipes) && JSON.stringify(cur.recipes || []) !== JSON.stringify(r.recipes)
    const prepChanged = r.weeklyPrep && (!cur.weeklyMealPrep?.length || cur.weeklyMealPrep.some(p => p.isActive && p.currentPortions !== r.weeklyPrep.currentPortions))

    if (shareChanged || stockChanged || recipesChanged || prepChanged) {
      update(s => {
        if (shareChanged) s.shoppingShare = nextShare
        if (stockChanged) s.stock = r.stock
        if (recipesChanged) s.recipes = r.recipes
        if (prepChanged && r.weeklyPrep) {
          if (!s.weeklyMealPrep || !s.weeklyMealPrep.length) {
            s.weeklyMealPrep = [{
              id: 'prep-shared',
              name: r.weeklyPrep.name || 'Marmitas',
              recipeId: null,
              days: r.weeklyPrep.days || [1, 2, 3, 4, 5],
              peopleCount: r.weeklyPrep.peopleCount || 2,
              totalPortions: r.weeklyPrep.totalPortions || 10,
              currentPortions: r.weeklyPrep.currentPortions != null ? r.weeklyPrep.currentPortions : 10,
              kind: r.weeklyPrep.kind || 'BATCH',
              isActive: true,
            }]
          } else {
            s.weeklyMealPrep = s.weeklyMealPrep.map(p => p.isActive ? {
              ...p,
              currentPortions: r.weeklyPrep.currentPortions,
              totalPortions: r.weeklyPrep.totalPortions || p.totalPortions,
            } : p)
          }
        }
      }, false)
    }
  }

  // Periodic polling (every 3 seconds)
  useEffect(() => {
    if (!user || !code) return
    let gone = false

    const sync = async () => {
      if (gone || isSyncingRef.current) return
      isSyncingRef.current = true
      try {
        const payload = localPayload()
        const r = await api('/api/shopping/share/join', {
          method: 'POST',
          body: JSON.stringify({
            code,
            lines: payload.lines,
            stock: payload.stock,
            recipes: payload.recipes,
            weeklyPrep: payload.weeklyPrep,
          }),
        })
        if (!gone) applyShareMeta(r)
      } catch {
        // network or expiration handled
      } finally {
        isSyncingRef.current = false
      }
    }

    sync()
    const tick = setInterval(sync, 3000)
    return () => { gone = true; clearInterval(tick) }
  }, [user, code])
}
