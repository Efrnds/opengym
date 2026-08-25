import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { uid } from '../lib/format.js'
import { useStore } from '../store/useStore.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const PROGRAM_TEMPLATES = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs (PPL)',
    desc: 'O split mais popular e eficiente para hipertrofia e estética.',
    days: '3 ou 6 dias / semana',
    emoji: 'dumbbell',
    routines: [
      {
        name: 'Push (Peito, Ombros e Tríceps)',
        emoji: 'dumbbell',
        prog: 'linear',
        ex: [
          { id: '0025', sets: 4, reps: 8, restSec: 120 }, // Barbell Bench Press
          { id: '0289', sets: 3, reps: 10, restSec: 90 }, // Dumbbell Incline / Flat Press
          { id: 'g011', sets: 3, reps: 10, restSec: 90 }, // Machine Shoulder Press
          { id: 'g010', sets: 4, reps: 12, restSec: 60 }, // Cable Lateral Raise
          { id: 'g017', sets: 3, reps: 12, restSec: 60 }, // Rope Triceps Pushdown
          { id: 'g021', sets: 3, reps: 10, restSec: 90 }  // EZ-Bar Skullcrusher
        ]
      },
      {
        name: 'Pull (Costas, Deltoide Posterior e Bíceps)',
        emoji: 'anchor',
        prog: 'linear',
        ex: [
          { id: 'g005', sets: 4, reps: 8, restSec: 120 }, // V-Bar Lat Pulldown
          { id: 'g006', sets: 4, reps: 10, restSec: 90 }, // Chest Supported T-Bar Row
          { id: 'g007', sets: 3, reps: 12, restSec: 90 }, // Seated Cable Row
          { id: 'g008', sets: 4, reps: 15, restSec: 60 }, // Reverse Pec Deck Fly
          { id: 'g022', sets: 3, reps: 10, restSec: 90 }, // EZ-Bar Preacher Curl
          { id: 'g047', sets: 3, reps: 12, restSec: 60 }  // Hammer Curl on Cable
        ]
      },
      {
        name: 'Legs (Quadríceps, Posterior, Glúteos e Panturrilha)',
        emoji: 'figureRun',
        prog: 'linear',
        ex: [
          { id: '0043', sets: 4, reps: 8, restSec: 150 }, // Barbell Squat
          { id: 'g040', sets: 3, reps: 10, restSec: 120 }, // Leg Press 45
          { id: 'g026', sets: 3, reps: 12, restSec: 90 },  // Leg Extension
          { id: 'g027', sets: 4, reps: 10, restSec: 90 },  // Lying Leg Curl
          { id: 'g001', sets: 3, reps: 10, restSec: 120 }, // Barbell Hip Thrust
          { id: 'g032', sets: 4, reps: 15, restSec: 60 },  // Seated Calf Raise
          { id: 'g034', sets: 3, reps: 15, restSec: 60 }   // Cable Crunch
        ]
      }
    ],
    schedule: { 1: 0, 3: 1, 5: 2 } // Mon Push, Wed Pull, Fri Legs
  },
  {
    id: 'upper_lower',
    name: 'Superior / Inferior (Upper / Lower)',
    desc: '4 dias por semana. Frequência 2x por grupo muscular para máxima evolução.',
    days: '4 dias / semana',
    emoji: 'bolt',
    routines: [
      {
        name: 'Upper A (Foco Força e Peito/Costas)',
        emoji: 'bolt',
        prog: 'linear',
        ex: [
          { id: '0025', sets: 4, reps: 6, restSec: 120 }, // Bench Press
          { id: '0027', sets: 4, reps: 6, restSec: 120 }, // Barbell Row
          { id: '01456', sets: 3, reps: 8, restSec: 90 }, // Overhead Press
          { id: 'g005', sets: 3, reps: 10, restSec: 90 }, // V-Bar Pulldown
          { id: 'g017', sets: 3, reps: 12, restSec: 60 }, // Triceps Pushdown
          { id: 'g022', sets: 3, reps: 10, restSec: 60 }  // Preacher Curl
        ]
      },
      {
        name: 'Lower A (Foco Quadríceps e Panturrilha)',
        emoji: 'flame',
        prog: 'linear',
        ex: [
          { id: '0043', sets: 4, reps: 6, restSec: 150 }, // Squat
          { id: 'g040', sets: 3, reps: 10, restSec: 120 }, // Leg Press 45
          { id: 'g026', sets: 3, reps: 12, restSec: 90 },  // Leg Extension
          { id: 'g027', sets: 4, reps: 10, restSec: 90 },  // Lying Leg Curl
          { id: 'g032', sets: 4, reps: 15, restSec: 60 },  // Calf Raise
          { id: 'g036', sets: 3, reps: 45, restSec: 60 }   // Plank
        ]
      },
      {
        name: 'Upper B (Foco Hipertrofia e Ombros/Braços)',
        emoji: 'sparkles',
        prog: 'linear',
        ex: [
          { id: '0314', sets: 4, reps: 10, restSec: 90 }, // Incline DB Press
          { id: 'g006', sets: 4, reps: 10, restSec: 90 }, // Chest Supported Row
          { id: 'g010', sets: 4, reps: 12, restSec: 60 }, // Cable Lateral Raise
          { id: 'g009', sets: 3, reps: 15, restSec: 60 }, // Cable Face Pull
          { id: 'g020', sets: 3, reps: 12, restSec: 60 }, // Overhead Cable Triceps
          { id: 'g046', sets: 3, reps: 12, restSec: 60 }  // Incline DB Curl
        ]
      },
      {
        name: 'Lower B (Foco Posterior e Glúteos)',
        emoji: 'trophy',
        prog: 'linear',
        ex: [
          { id: 'g042', sets: 4, reps: 8, restSec: 120 }, // Barbell RDL
          { id: 'g003', sets: 3, reps: 10, restSec: 90 },  // Bulgarian Split Squat
          { id: 'g028', sets: 4, reps: 12, restSec: 90 },  // Seated Leg Curl
          { id: 'g001', sets: 3, reps: 10, restSec: 120 }, // Hip Thrust
          { id: 'g045', sets: 4, reps: 15, restSec: 60 },  // Leg Press Calf Raise
          { id: 'g034', sets: 3, reps: 15, restSec: 60 }   // Cable Crunch
        ]
      }
    ],
    schedule: { 1: 0, 2: 1, 4: 2, 5: 3 } // Mon Upper A, Tue Lower A, Thu Upper B, Fri Lower B
  },
  {
    id: 'arnold',
    name: 'Arnold Split (Golden Era)',
    desc: 'O clássico do fisiculturismo: Peito/Costas, Ombros/Braços, Pernas.',
    days: '6 dias / semana',
    emoji: 'trophy',
    routines: [
      {
        name: 'A: Peito e Costas (Antagonistas)',
        emoji: 'trophy',
        prog: 'linear',
        ex: [
          { id: '0025', sets: 4, reps: 8, restSec: 120 },
          { id: '0027', sets: 4, reps: 8, restSec: 120 },
          { id: '0314', sets: 3, reps: 10, restSec: 90 },
          { id: 'g005', sets: 3, reps: 10, restSec: 90 },
          { id: 'g014', sets: 3, reps: 12, restSec: 60 },
          { id: 'g007', sets: 3, reps: 12, restSec: 60 }
        ]
      },
      {
        name: 'B: Ombros, Bíceps e Tríceps',
        emoji: 'bolt',
        prog: 'linear',
        ex: [
          { id: '0289', sets: 4, reps: 8, restSec: 90 },
          { id: 'g010', sets: 4, reps: 12, restSec: 60 },
          { id: 'g008', sets: 3, reps: 15, restSec: 60 },
          { id: 'g022', sets: 3, reps: 10, restSec: 60 },
          { id: 'g017', sets: 3, reps: 12, restSec: 60 },
          { id: 'g024', sets: 3, reps: 21, restSec: 90 }
        ]
      },
      {
        name: 'C: Pernas e Abdômen',
        emoji: 'flame',
        prog: 'linear',
        ex: [
          { id: '0043', sets: 4, reps: 8, restSec: 150 },
          { id: 'g040', sets: 3, reps: 10, restSec: 120 },
          { id: 'g027', sets: 4, reps: 10, restSec: 90 },
          { id: 'g026', sets: 3, reps: 12, restSec: 90 },
          { id: 'g032', sets: 4, reps: 15, restSec: 60 },
          { id: 'g034', sets: 3, reps: 15, restSec: 60 }
        ]
      }
    ],
    schedule: { 1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2 }
  }
]

export default function ProgramGenerator({ close }) {
  const update = useStore(s => s.update)
  const [selected, setSelected] = useState(PROGRAM_TEMPLATES[0].id)

  const applyProgram = () => {
    const tmpl = PROGRAM_TEMPLATES.find(p => p.id === selected)
    if (!tmpl) return

    update(st => {
      // Create new routines from template
      const created = tmpl.routines.map(r => ({
        id: uid(),
        name: r.name,
        emoji: r.emoji || 'dumbbell',
        prog: r.prog || 'linear',
        ex: r.ex.map(e => ({
          id: e.id,
          target: { sets: e.sets, reps: e.reps, restSec: e.restSec }
        }))
      }))

      st.routines.push(...created)

      // Apply schedule to week
      if (tmpl.schedule) {
        Object.entries(tmpl.schedule).forEach(([day, routineIdx]) => {
          if (created[routineIdx]) {
            st.week[day] = created[routineIdx].id
          }
        })
      }
    })

    close()
  }

  return (
    <div style={{ padding: '6px 0' }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>{t('Guided Trainer Programs')}</h3>
        <span className="tag acc">{t('Hevy Pro')}</span>
      </div>
      <div className="muted small" style={{ marginBottom: 16 }}>
        {t('Choose a scientifically structured training program with progression rules')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {PROGRAM_TEMPLATES.map(p => {
          const isSel = selected === p.id
          return (
            <div
              key={p.id}
              onClick={() => setSelected(p.id)}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: isSel ? 'var(--acc)' : 'var(--border)',
                background: isSel ? 'var(--surface-2)' : 'var(--card-bg)',
                transition: 'all 0.2s ease',
                margin: 0
              }}
            >
              <div className="row between" style={{ marginBottom: 4 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <Icon name={p.emoji} style={{ color: 'var(--acc)', fontSize: 18 }} />
                  <span className="bold">{p.name}</span>
                </div>
                <span className="tag dim">{p.days}</span>
              </div>
              <div className="muted small" style={{ marginBottom: 8 }}>{p.desc}</div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {p.routines.map((r, i) => (
                  <span key={i} className="chip nocap" style={{ fontSize: 11, padding: '2px 8px' }}>
                    {r.name.split(' (')[0]} ({r.ex.length} ex)
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
        <Button variant="primary" icon="sparkles" onClick={applyProgram}>
          {t('Load Program to Plan')}
        </Button>
      </div>
    </div>
  )
}
