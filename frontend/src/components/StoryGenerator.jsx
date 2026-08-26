import { useRef } from 'react'
import { t } from '../lib/i18n.js'
import { fmtDur, fmtVol, fmtNum, fmtDate } from '../lib/format.js'
import { setsDone, workSetsDone } from '../lib/history.js'
import { EXIDX } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function StoryGenerator({ workout, prs = [], unit = 'kg', close }) {
  const cardRef = useRef(null)

  const w = workout || {}
  const duration = w.end && w.start ? fmtDur(w.end - w.start) : '45m'
  const volume = fmtVol(w.vol || 0, unit)
  const totalSets = setsDone(w)
  const workSets = workSetsDone(w)

  const exerciseList = (w.entries || []).slice(0, 6).map(e => {
    const ex = EXIDX[e.id] || { n: e.id }
    const topW = Math.max(...(e.sets || []).map(s => s.w || 0), 0)
    return {
      name: exerciseNameFor(ex),
      sets: (e.sets || []).length,
      topW: topW > 0 ? `${fmtNum(topW)} ${unit}` : ''
    }
  })

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Treino Concluído: ${w.name || t('Workout')}`,
          text: `Finalizei meu treino hoje! 🔥 Duração: ${duration} | Volume Total: ${volume} | ${totalSets} séries. 💪 Registrado no openGym.`
        })
      } catch (err) {
        // user cancelled or share failed
      }
    }
  }

  return (
    <div style={{ padding: '6px 0', textAlign: 'center' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{t('Story generator')}</h3>
        <span className="tag acc">Instagram / WhatsApp</span>
      </div>

      {/* Story Card 9:16 Visual */}
      <div
        ref={cardRef}
        style={{
          background: 'linear-gradient(145deg, #0d1117 0%, #161b22 50%, #1f2937 100%)',
          border: '2px solid var(--acc, #3a86ff)',
          borderRadius: 20,
          padding: '24px 18px',
          color: '#fff',
          maxWidth: 340,
          margin: '0 auto 16px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          textAlign: 'left',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            background: 'radial-gradient(circle, rgba(58,134,255,0.4) 0%, rgba(0,0,0,0) 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />

        {/* Header */}
        <div className="row between" style={{ marginBottom: 14, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--acc, #3a86ff)', fontWeight: 700 }}>
              OPENGYM TRACKER
            </div>
            <h2 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800 }}>
              {w.name || t('Workout')}
            </h2>
          </div>
          <div style={{ fontSize: 24, color: 'var(--yellow, #fbbf24)' }}>🔥</div>
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
          {fmtDate(w.d || new Date().toISOString(), true)}
        </div>

        {/* Big Metric Tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 16
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '10px 12px'
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{t('Duration')}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--acc, #3a86ff)' }}>{duration}</div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '10px 12px'
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{t('Volume')}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--acc, #3a86ff)' }}>{volume}</div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '10px 12px'
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{t('Sets')}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{totalSets} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>({workSets} {t('work')})</span></div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '10px 12px'
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{t('PRs')}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: prs.length ? 'var(--yellow, #fbbf24)' : '#fff' }}>
              {prs.length ? `🏆 ${prs.length}` : '—'}
            </div>
          </div>
        </div>

        {/* Exercises summary */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
            {t('Exercises Done')}:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {exerciseList.map((e, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 6
                }}
              >
                <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{e.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {e.sets} {t('sets')} {e.topW && `· ${e.topW}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Brand */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
          FEITO COM OPENGYM
        </div>
      </div>

      <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
        <Button variant="ghost" onClick={close}>{t('Close')}</Button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button variant="primary" icon="upload" onClick={shareNative}>
            {t('Share')}
          </Button>
        )}
      </div>
    </div>
  )
}
