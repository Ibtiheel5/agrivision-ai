import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function predict(file) {
  const form = new FormData()
  form.append('file', file)
  const t0 = performance.now()
  const { data } = await axios.post(`${API}/predict`, form)
  return { ...data, client_ms: performance.now() - t0 }
}

export const getHealth = () => axios.get(`${API}/health`).then((r) => r.data)
export const getMetadata = () => axios.get(`${API}/model/metadata`).then((r) => r.data)
