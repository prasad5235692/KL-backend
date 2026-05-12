import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import app from './src/app.js'

const port = Number.parseInt(process.env.PORT ?? '5000', 10)
const isDirectRun = Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isDirectRun) {
  app.listen(port, () => {
    console.log(`Contact mail API listening on port ${port}`)
  })
}

export default app