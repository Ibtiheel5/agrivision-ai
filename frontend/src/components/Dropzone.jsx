export default function Dropzone({ onFile }) {
  const handle = (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0] || e.target.files?.[0]
    if (file) onFile(file)
  }
  return (
    <div onDrop={handle} onDragOver={(e) => e.preventDefault()}
         style={{ border: '2px dashed #2b6a4d', padding: 32, textAlign: 'center' }}>
      <p>Glisser une image ici ou</p>
      <input type="file" accept="image/*" onChange={handle} />
    </div>
  )
}
