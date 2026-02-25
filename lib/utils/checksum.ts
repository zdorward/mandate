import { createHash } from 'crypto'

export function computeChecksum(data: unknown): string {
  const normalized = JSON.stringify(data, Object.keys(data as object).sort())
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16)
}
