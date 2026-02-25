import OpenAI from 'openai'

export function isDemo(): boolean {
  return !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo'
}

export function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'demo',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  })
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o'
}
