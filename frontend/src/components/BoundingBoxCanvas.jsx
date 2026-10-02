import { useEffect, useRef } from 'react'

const COLORS = ['#2b6a4d', '#c0392b', '#2980b9', '#8e44ad', '#d35400', '#16a085']

export default function BoundingBoxCanvas({ src, detections }) {
  const ref = useRef(null)
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const c = ref.current
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const labels = [...new Set(detections.map((d) => d.label))]
      detections.forEach((d) => {
        const [x1, y1, x2, y2] = d.box
        ctx.strokeStyle = COLORS[labels.indexOf(d.label) % COLORS.length]
        ctx.lineWidth = 3
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
        ctx.fillStyle = ctx.strokeStyle
        ctx.fillText(`${d.label} ${(d.confidence * 100).toFixed(0)}%`, x1 + 3, y1 + 12)
      })
    }
    img.src = src
  }, [src, detections])
  return <canvas ref={ref} style={{ maxWidth: '100%' }} />
}
