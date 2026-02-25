import { z } from 'zod'

export function extractAndValidateJson<T>(
  raw: string,
  schema: z.ZodSchema<T>
): T {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    // Try to extract from markdown code block
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1].trim())
      } catch {
        throw new Error('Failed to parse JSON from code block')
      }
    } else {
      // Try to find JSON object in the text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          throw new Error('Failed to parse extracted JSON')
        }
      } else {
        throw new Error('No JSON found in response')
      }
    }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Schema validation failed: ${result.error.message}`)
  }

  return result.data
}
