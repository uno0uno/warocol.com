import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCategorySearch, type CategoryRow } from './useCategorySearch'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const category = (id: string, name: string): CategoryRow => ({
  id,
  name,
  description: null,
  tenant_id: null,
  created_at: '',
  updated_at: '',
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useCategorySearch', () => {
  it('ignores a late initial response after a typed search has completed', async () => {
    vi.useFakeTimers()
    const initialRequest = deferred<{ data: CategoryRow[] }>()
    const typedRequest = deferred<{ data: CategoryRow[] }>()
    const fetchMock = vi.fn()
      .mockReturnValueOnce(initialRequest.promise)
      .mockReturnValueOnce(typedRequest.promise)
    vi.stubGlobal('$fetch', fetchMock)

    let search!: ReturnType<typeof useCategorySearch>
    const Host = defineComponent({
      setup() {
        search = useCategorySearch()
        return () => h('div')
      },
    })
    const wrapper = mount(Host)

    await vi.advanceTimersByTimeAsync(300)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/menu/categories', {
      query: { limit: 50 },
    })

    search.query.value = 'cate'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/menu/categories', {
      query: { search: 'cate', limit: 50 },
    })

    typedRequest.resolve({ data: [category('latest', 'Categoría muestra')] })
    await flushPromises()
    expect(search.results.value.map(item => item.id)).toEqual(['latest'])

    initialRequest.resolve({ data: [category('stale', 'Respuesta anterior')] })
    await flushPromises()
    expect(search.results.value.map(item => item.id)).toEqual(['latest'])
    expect(search.loading.value).toBe(false)

    wrapper.unmount()
  })
})
