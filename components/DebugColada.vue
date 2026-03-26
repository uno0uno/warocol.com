
import { useQuery } from '@pinia/colada'
import { defineComponent, onMounted } from 'vue'

export default defineComponent({
  setup() {
    const query = useQuery({
      key: ['debug'],
      query: () => Promise.resolve('debug'),
    })
    onMounted(() => {
      console.log('Pinia Colada Query Keys:', Object.keys(query))
      console.log('Pinia Colada Query Status:', query.status.value)
      console.log('Pinia Colada Query AsyncStatus:', query.asyncStatus.value)
      if ((query as any).isLoading) {
        console.log('Pinia Colada isLoading exists:', (query as any).isLoading.value)
      }
    })
    return {}
  },
  template: '<div>Debug</div>'
})
