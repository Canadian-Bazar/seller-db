import http from 'http'
import https from 'https'

export const createBuyerForSeller = ({
  buyerServiceUrl,
  sharedSecret,
  payload,
}) => new Promise((resolve) => {
  try {
    const url = new URL('/api/v1/internal/buyer/create', buyerServiceUrl)
    const data = JSON.stringify(payload)

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-internal-secret': sharedSecret,
      },
    }

    const client = url.protocol === 'https:' ? https : http

    if (process.env.INTERNAL_SYNC_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.log('[buyer-sync] sending →', url.toString())
    }

    const req = client.request(url, options, (res) => {
      // Consume response fully but ignore body; resolve regardless
      res.on('data', () => {})
      res.on('end', () => {
        if (process.env.INTERNAL_SYNC_DEBUG === 'true') {
          // eslint-disable-next-line no-console
          console.log('[buyer-sync] status:', res.statusCode)
        }
        resolve({ statusCode: res.statusCode })
      })
    })

    req.on('error', (e) => {
      if (process.env.INTERNAL_SYNC_DEBUG === 'true') {
        // eslint-disable-next-line no-console
        console.log('[buyer-sync] error:', e?.message)
      }
      resolve({ statusCode: 0 })
    })
    req.write(data)
    req.end()
  } catch (_e) {
    if (process.env.INTERNAL_SYNC_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.log('[buyer-sync] request build error')
    }
    resolve({ statusCode: 0 })
  }
})


