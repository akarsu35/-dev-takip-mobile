import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    // Database sorguları için timeout — auth endpoint'leri hariç
    fetch: (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      // Auth endpoint'lerine timeout uygulama
      if (urlStr.includes('/auth/')) {
        return fetch(urlStr, options)
      }

      // Database sorguları için 20s timeout (cleanup'lı)
      let timeoutId: ReturnType<typeof setTimeout>
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Supabase fetch timeout'))
        }, 20000)
      })
      // Timeout hatasını sessizce yakala (fetch kazanırsa timeout boşa çıkar)
      timeoutPromise.catch(() => {})

      return Promise.race([
        fetch(urlStr, options).then(res => {
          clearTimeout(timeoutId) // Fetch kazandı, timeout'u temizle
          return res
        }),
        timeoutPromise
      ])
    },
  },
})


