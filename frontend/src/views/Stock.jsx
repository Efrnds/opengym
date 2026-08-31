import { Navigate, useSearchParams } from 'react-router-dom'

/** Pantry lives inside Nutrition hub (/diet → Stock tab). */
export default function Stock() {
  const [params] = useSearchParams()
  const q = new URLSearchParams(params)
  q.set('tab', 'stock')
  return <Navigate to={`/diet?${q.toString()}`} replace />
}
