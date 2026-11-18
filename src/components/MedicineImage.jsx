import { useState } from 'react'
import { Icon } from './icons'

function MedicineImage({ medicine, className = '' }) {
  const [failedUrl, setFailedUrl] = useState('')
  const url = medicine?.imageUrl

  // Show the photo when it loads; fall back to a neutral placeholder when a
  // medicine has no photo or the stored URL cannot be loaded.
  if (url && url !== failedUrl) {
    return (
      <img
        className={`medicine-thumb ${className}`.trim()}
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailedUrl(url)}
      />
    )
  }

  return (
    <span className={`medicine-thumb medicine-thumb-empty ${className}`.trim()}>
      <Icon name="medicines" size={20} />
    </span>
  )
}

export default MedicineImage
