import { useEffect, useRef } from 'react'
import { Stack } from 'expo-router'
import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import React from 'react'
import { useTheme } from '../constants/Colors'

// Login ekranı kendi navigation'ını yönetirken _layout'un müdahale etmesini engeller
export const suppressAuthNav = { current: false }

function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const loadData = useStore((s) => s.loadData)

  useEffect(() => {
    // İlk açılışta mevcut oturum kontrolü — veriyi yükle ve yönlendir
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadData(session.user.id) // İlk yükleme (background)
        router.replace('/(tabs)')
      } else {
        router.replace('/(auth)/login')
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('onAuthStateChange:', event, session ? 'has session' : 'no session')

      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Login ekranı kendi routing'ini hallediyorsa bu event'i yoksay
        if (suppressAuthNav.current) {
          console.log('onAuthStateChange: SIGNED_IN suppressed — login screen is handling navigation')
          return
        }
        router.replace('/(tabs)')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return <>{children}</>
}

export default function RootLayout() {
  const theme = useTheme()
  const isDark = theme.isDark

  return (
    <ActionSheetProvider>
      <AuthProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ActionSheetProvider>
  )
}
