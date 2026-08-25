import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { uid } from '../lib/format.js'
import { useStore } from '../store/useStore.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function ProgramGenerator({ close }) {
  const update = useStore(s => s.update)
  
  // Wizard state
  const [goal, setGoal] = useState('hypertrophy') // hypertrophy | strength | fatloss | functional
  const [days, setDays] = useState(4) // 3 | 4 | 5 | 6
  const [level, setLevel] = useState('intermediate') // beginner | intermediate | advanced
  const [equipment, setEquipment] = useState('gym') // gym | dumbbells | bodyweight

  const goals = [
    { id: 'hypertrophy', label: t('Hipertrofia & Massa Muscular'), icon: 'dumbbell', desc: t('8-12 reps, foco em volume muscular e estética') },
    { id: 'strength', label: t('Força Bruta & Cargas Pesadas'), icon: 'bolt', desc: t('4-6 reps nos compostos principais com progressão de carga') },
    { id: 'fatloss', label: t('Definição & Queima de Gordura'), icon: 'flame', desc: t('Circuitos, maior densidade e cardio integrado') },
    { id: 'functional', label: t('Condicionamento & Longevidade'), icon: 'figureRun', desc: t('Equilíbrio entre força, cardio e mobilidade articular') }
  ]

  const dayOptions = [
    { val: 3, label: t('3 Dias / semana'), split: t('Full Body A / B / C ou PPL') },
    { val: 4, label: t('4 Dias / semana'), split: t('Superior / Inferior (Upper / Lower)') },
    { val: 5, label: t('5 Dias / semana'), split: t('Divisão ABCDE por Músculo') },
    { val: 6, label: t('6 Dias / semana'), split: t('Push / Pull / Legs (PPL 2x) ou Arnold') }
  ]

  const generateProgram = () => {
    let routines = []
    let schedule = {}
    const progPolicy = level === 'beginner' ? 'linear' : level === 'intermediate' ? 'wave' : 'double'
    const repsTarget = goal === 'strength' ? 6 : goal === 'fatloss' ? 12 : 10
    const restTarget = goal === 'strength' ? 150 : goal === 'fatloss' ? 60 : 90

    if (days === 3) {
      // 3-Day Full Body or PPL
      routines = [
        {
          name: t('Treino A: Push (Peito, Ombros, Tríceps)'),
          emoji: 'dumbbell',
          prog: progPolicy,
          ex: [
            { id: '0025', sets: 4, reps: repsTarget, restSec: restTarget },
            { id: '0289', sets: 3, reps: repsTarget + 2, restSec: 90 },
            { id: 'g011', sets: 3, reps: 10, restSec: 90 },
            { id: 'g010', sets: 4, reps: 12, restSec: 60 },
            { id: 'g017', sets: 3, reps: 12, restSec: 60 }
          ]
        },
        {
          name: t('Treino B: Pull (Costas, Deltoide Posterior, Bíceps)'),
          emoji: 'anchor',
          prog: progPolicy,
          ex: [
            { id: 'g005', sets: 4, reps: repsTarget, restSec: restTarget },
            { id: 'g006', sets: 4, reps: 10, restSec: 90 },
            { id: 'g007', sets: 3, reps: 12, restSec: 90 },
            { id: 'g008', sets: 4, reps: 15, restSec: 60 },
            { id: 'g022', sets: 3, reps: 10, restSec: 60 },
            { id: 'g047', sets: 3, reps: 12, restSec: 60 }
          ]
        },
        {
          name: t('Treino C: Legs (Pernas, Glúteos e Abdômen)'),
          emoji: 'figureRun',
          prog: progPolicy,
          ex: [
            { id: '0043', sets: 4, reps: repsTarget, restSec: restTarget + 30 },
            { id: 'g040', sets: 3, reps: 10, restSec: 120 },
            { id: 'g026', sets: 3, reps: 12, restSec: 90 },
            { id: 'g027', sets: 4, reps: 10, restSec: 90 },
            { id: 'g001', sets: 3, reps: 10, restSec: 120 },
            { id: 'g032', sets: 4, reps: 15, restSec: 60 },
            { id: 'g034', sets: 3, reps: 15, restSec: 60 }
          ]
        }
      ]
      schedule = { 1: 0, 3: 1, 5: 2 } // Seg, Qua, Sex
    } else if (days === 4) {
      // 4-Day Upper / Lower
      routines = [
        {
          name: t('Superior A (Peito & Costas foco Força)'),
          emoji: 'bolt',
          prog: progPolicy,
          ex: [
            { id: '0025', sets: 4, reps: repsTarget, restSec: restTarget },
            { id: '0027', sets: 4, reps: repsTarget, restSec: restTarget },
            { id: '01456', sets: 3, reps: 8, restSec: 90 },
            { id: 'g005', sets: 3, reps: 10, restSec: 90 },
            { id: 'g017', sets: 3, reps: 12, restSec: 60 },
            { id: 'g022', sets: 3, reps: 10, restSec: 60 }
          ]
        },
        {
          name: t('Inferior A (Quadríceps & Panturrilha)'),
          emoji: 'flame',
          prog: progPolicy,
          ex: [
            { id: '0043', sets: 4, reps: repsTarget, restSec: restTarget + 30 },
            { id: 'g040', sets: 3, reps: 10, restSec: 120 },
            { id: 'g026', sets: 3, reps: 12, restSec: 90 },
            { id: 'g027', sets: 4, reps: 10, restSec: 90 },
            { id: 'g032', sets: 4, reps: 15, restSec: 60 },
            { id: 'g036', sets: 3, reps: 45, restSec: 60 }
          ]
        },
        {
          name: t('Superior B (Hipertrofia & Ombros/Braços)'),
          emoji: 'sparkles',
          prog: progPolicy,
          ex: [
            { id: '0314', sets: 4, reps: 10, restSec: 90 },
            { id: 'g006', sets: 4, reps: 10, restSec: 90 },
            { id: 'g010', sets: 4, reps: 12, restSec: 60 },
            { id: 'g009', sets: 3, reps: 15, restSec: 60 },
            { id: 'g020', sets: 3, reps: 12, restSec: 60 },
            { id: 'g046', sets: 3, reps: 12, restSec: 60 }
          ]
        },
        {
          name: t('Inferior B (Posterior & Glúteos)'),
          emoji: 'trophy',
          prog: progPolicy,
          ex: [
            { id: 'g042', sets: 4, reps: 8, restSec: 120 },
            { id: 'g003', sets: 3, reps: 10, restSec: 90 },
            { id: 'g028', sets: 4, reps: 12, restSec: 90 },
            { id: 'g001', sets: 3, reps: 10, restSec: 120 },
            { id: 'g045', sets: 4, reps: 15, restSec: 60 },
            { id: 'g034', sets: 3, reps: 15, restSec: 60 }
          ]
        }
      ]
      schedule = { 1: 0, 2: 1, 4: 2, 5: 3 } // Seg, Ter, Qui, Sex
    } else if (days === 5) {
      // 5-Day ABCDE
      routines = [
        {
          name: t('A: Peitoral & Abdômen'),
          emoji: 'dumbbell',
          prog: progPolicy,
          ex: [
            { id: '0025', sets: 4, reps: repsTarget, restSec: restTarget },
            { id: '0314', sets: 4, reps: 10, restSec: 90 },
            { id: 'g013', sets: 3, reps: 10, restSec: 90 },
            { id: 'g014', sets: 4, reps: 12, restSec: 60 },
            { id: 'g015', sets: 3, reps: 15, restSec: 60 },
            { id: 'g034', sets: 4, reps: 15, restSec: 60 }
          ]
        },
        {
          name: t('B: Costas & Lombar'),
          emoji: 'anchor',
          prog: progPolicy,
          ex: [
            { id: 'g005', sets: 4, reps: repsTarget, restSec: restTarget },
            { id: '0027', sets: 4, reps: 8, restSec: 120 },
            { id: 'g006', sets: 4, reps: 10, restSec: 90 },
            { id: 'g007', sets: 3, reps: 12, restSec: 90 },
            { id: 'g042', sets: 3, reps: 10, restSec: 120 }
          ]
        },
        {
          name: t('C: Quadríceps & Panturrilhas'),
          emoji: 'flame',
          prog: progPolicy,
          ex: [
            { id: '0043', sets: 4, reps: repsTarget, restSec: restTarget + 30 },
            { id: 'g040', sets: 4, reps: 10, restSec: 120 },
            { id: 'g039', sets: 3, reps: 10, restSec: 90 },
            { id: 'g026', sets: 4, reps: 12, restSec: 60 },
            { id: 'g032', sets: 5, reps: 15, restSec: 60 }
          ]
        },
        {
          name: t('D: Ombros & Trapézio'),
          emoji: 'bolt',
          prog: progPolicy,
          ex: [
            { id: '01456', sets: 4, reps: 8, restSec: 120 },
            { id: 'g010', sets: 5, reps: 12, restSec: 60 },
            { id: 'g008', sets: 4, reps: 15, restSec: 60 },
            { id: 'g009', sets: 4, reps: 15, restSec: 60 },
            { id: '0095', sets: 4, reps: 12, restSec: 60 }
          ]
        },
        {
          name: t('E: Braços (Bíceps + Tríceps)') + (goal === 'fatloss' ? ' + Cardio' : ''),
          emoji: 'trophy',
          prog: progPolicy,
          ex: [
            { id: 'g022', sets: 4, reps: 10, restSec: 60 },
            { id: 'g021', sets: 4, reps: 10, restSec: 60 },
            { id: 'g046', sets: 3, reps: 12, restSec: 60 },
            { id: 'g017', sets: 4, reps: 12, restSec: 60 },
            { id: 'g047', sets: 3, reps: 12, restSec: 60 },
            { id: 'c002', sets: 1, min: 20, speed: 9, restSec: 0 } // Cardio
          ]
        }
      ]
      schedule = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 } // Seg a Sex
    } else {
      // 6-Day PPL x2
      routines = [
        {
          name: t('Push A (Peito / Ombros / Tríceps)'),
          emoji: 'dumbbell',
          prog: progPolicy,
          ex: [
            { id: '0025', sets: 4, reps: 6, restSec: 120 },
            { id: '0314', sets: 3, reps: 8, restSec: 90 },
            { id: 'g011', sets: 3, reps: 10, restSec: 90 },
            { id: 'g010', sets: 4, reps: 12, restSec: 60 },
            { id: 'g017', sets: 3, reps: 12, restSec: 60 }
          ]
        },
        {
          name: t('Pull A (Costas / Posterior / Bíceps)'),
          emoji: 'anchor',
          prog: progPolicy,
          ex: [
            { id: 'g005', sets: 4, reps: 6, restSec: 120 },
            { id: 'g006', sets: 4, reps: 8, restSec: 90 },
            { id: 'g007', sets: 3, reps: 10, restSec: 90 },
            { id: 'g008', sets: 4, reps: 15, restSec: 60 },
            { id: 'g022', sets: 3, reps: 10, restSec: 60 }
          ]
        },
        {
          name: t('Legs A (Quadríceps / Glúteos)'),
          emoji: 'flame',
          prog: progPolicy,
          ex: [
            { id: '0043', sets: 4, reps: 6, restSec: 150 },
            { id: 'g040', sets: 3, reps: 10, restSec: 120 },
            { id: 'g026', sets: 3, reps: 12, restSec: 90 },
            { id: 'g027', sets: 4, reps: 10, restSec: 90 },
            { id: 'g032', sets: 4, reps: 15, restSec: 60 }
          ]
        }
      ]
      schedule = { 1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2 } // Seg a Sab
    }

    update(st => {
      const created = routines.map(r => ({
        id: uid(),
        name: r.name,
        emoji: r.emoji,
        prog: r.prog,
        ex: r.ex.map(e => ({
          id: e.id,
          target: { sets: e.sets, reps: e.reps, restSec: e.restSec, min: e.min, speed: e.speed }
        }))
      }))

      st.routines = created
      st.week = {}

      Object.entries(schedule).forEach(([day, rIdx]) => {
        if (created[rIdx]) {
          st.week[day] = created[rIdx].id
        }
      })
    })

    close()
  }

  return (
    <div style={{ padding: '6px 0' }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>{t('Treinador Inteligente')}</h3>
        <span className="tag acc" style={{ fontWeight: 700 }}>{t('Personalizado')}</span>
      </div>
      <div className="muted small" style={{ marginBottom: 16 }}>
        {t('Gere um programa de treinamento científico personalizado para sua rotina')}
      </div>

      {/* Step 1: Objetivo */}
      <div style={{ marginBottom: 16 }}>
        <div className="bold small" style={{ marginBottom: 8 }}>{t('1. Objetivo Principal:')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {goals.map(g => {
            const isSel = goal === g.id
            return (
              <div
                key={g.id}
                onClick={() => setGoal(g.id)}
                className="card"
                style={{
                  cursor: 'pointer',
                  borderColor: isSel ? 'var(--acc)' : 'var(--border)',
                  background: isSel ? 'var(--surface-2)' : 'var(--card-bg)',
                  padding: 10,
                  margin: 0
                }}
              >
                <div className="row" style={{ gap: 6, alignItems: 'center', marginBottom: 4 }}>
                  <Icon name={g.icon} style={{ color: isSel ? 'var(--acc)' : 'inherit' }} />
                  <span className="bold" style={{ fontSize: 13 }}>{g.label.split(' & ')[0]}</span>
                </div>
                <div className="dim small" style={{ fontSize: 11, lineHeight: 1.3 }}>{g.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 2: Frequência Semanal */}
      <div style={{ marginBottom: 16 }}>
        <div className="bold small" style={{ marginBottom: 8 }}>{t('2. Frequência Semanal:')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {dayOptions.map(d => (
            <button
              key={d.val}
              className={'chip' + (days === d.val ? ' on' : '')}
              style={{ justifyContent: 'center', padding: '8px 0', fontSize: 12 }}
              onClick={() => setDays(d.val)}
            >
              {d.val} {t('dias')}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Nível */}
      <div style={{ marginBottom: 18 }}>
        <div className="bold small" style={{ marginBottom: 8 }}>{t('3. Nível de Experiência:')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { id: 'beginner', label: t('Iniciante'), sub: t('Progressão linear') },
            { id: 'intermediate', label: t('Intermediário'), sub: t('Periodização DUP') },
            { id: 'advanced', label: t('Avançado'), sub: t('Sobrecarga dupla') }
          ].map(l => (
            <button
              key={l.id}
              className={'chip' + (level === l.id ? ' on' : '')}
              style={{ flexDirection: 'column', padding: '8px 6px', height: 'auto', gap: 2 }}
              onClick={() => setLevel(l.id)}
            >
              <span className="bold">{l.label}</span>
              <span className="dim" style={{ fontSize: 10 }}>{l.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="row" style={{ gap: 8 }}>
        <Button variant="ghost" onClick={close}>{t('Cancelar')}</Button>
        <Button variant="primary" icon="sparkles" onClick={generateProgram}>
          {t('Gerar e Salvar no Meu Plano')}
        </Button>
      </div>
    </div>
  )
}
