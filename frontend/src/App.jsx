import { useState } from 'react'
import { predict } from './services/api'
import Dropzone from './components/Dropzone'
import BoundingBoxCanvas from './components/BoundingBoxCanvas'

export default function App() {
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)

  async function onFile(file) {
    setImage(URL.createObjectURL(file))
    setResult(await predict(file))
  }

  return (
    <main style={{ maxWidth: 900, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>AgriVision AI</h1>
      <Dropzone onFile={onFile} />
      {result && (
        <p>Latence : serveur {result.inference_ms.toFixed(0)} ms, client {result.client_ms.toFixed(0)} ms</p>
      )}
      {image && <BoundingBoxCanvas src={image} detections={result?.detections || []} />}
    </main>
  )
}
