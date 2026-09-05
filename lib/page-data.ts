import { notFound } from 'next/navigation'
import { apiFetch } from './api'

/** Required page data: only a confirmed upstream 404 means a missing page. */
export async function requiredPageData<T>(path: string) {
  const response = await apiFetch<T>(path).catch((error: Error & { status?: number }) => {
    if (error.status === 404) notFound()
    throw error
  })
  if (response.data == null) throw new Error('页面资料返回异常，请重试')
  return response.data
}

export function requirePositiveId(id: string) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound()
  return id
}
