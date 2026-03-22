import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { useStore } from '../../store/useStore'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { suppressAuthNav } from '../_layout'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { makeRedirectUri } from 'expo-auth-session'
import * as Linking from 'expo-linking'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const router = useRouter()
  const loadData = useStore((s) => s.loadData)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Email ve şifre gereklidir')
      return
    }
    setLoading(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) {
          Alert.alert(
            'Email Doğrulaması Gerekli',
            "Hesabınız oluşturuldu! Giriş yapmak için email'inizdeki onay linkine tıklayın.",
          )
        }
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        // Veriyi explicit yükle (onAuthStateChange artık loadData çağırmıyor)
        if (signInData.session) {
          await loadData(signInData.session.user.id, true)
          router.replace('/(tabs)')
        }
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // Expo Go'da scheme 'odevtakip' yerine 'exp://...' dönebilir.
      // Bu yüzden URI'yi daha esnek oluşturuyoruz.
      const redirectUri = makeRedirectUri({
        scheme: 'odevtakip',
        path: 'auth/callback',
        preferLocalhost: false,
      })
      
      console.log('--- REDIRECT URI DEBUG ---')
      console.log('Platform:', Platform.OS)
      console.log('Redirect URI:', redirectUri)
      console.log('Constants.appOwnership:', require('expo-constants').default.appOwnership)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: false,
        },
      })

      if (error) throw error
      
      if (data?.url) {
        console.log('--- SUPABASE OAUTH START ---')
        console.log('Redirect URI Sent:', redirectUri)
        console.log('Supabase URL Generated:', data.url)
        
        if (data.url.includes('localhost:3000')) {
          console.warn('WARNING: Supabase default redirect detected. Check dashboard settings!')
        }

        // _layout onAuthStateChange'in bu flow'da navigation'a müdahale etmesini engelle
        suppressAuthNav.current = true
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
        
        if (result.type === 'success' && result.url) {
          await handleAuthResult(result.url)
        } else {
          suppressAuthNav.current = false
          setLoading(false)
        }
      }
    } catch (error: any) {
      Alert.alert('Giriş Hatası', 'Google ile giriş yapılamadı. Redirect URL ayarlarını kontrol edin.')
      console.error('Google Login Error:', error)
      setLoading(false)
    }
  }

  // Oturum sonucunu işle, veriyi yükle ve yönlendir
  const handleAuthResult = async (url: string) => {
    try {
      const { access_token, refresh_token } = extractTokensFromUrl(url)
      let userId: string | null = null

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })
        if (error) throw error
        userId = data.session?.user?.id ?? null
      } else {
        // Eğer tokenlar URL'de yoksa, Supabase oturumu otomatik yakalamış olabilir
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Oturum bilgileri alınamadı.')
        userId = session.user.id
      }

      // OAuth redirect sonrası ağın toparlaması için bekle (Android'de network hiccup olabiliyor)
      console.log('handleAuthResult: Waiting for network to settle...')
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Önce veriyi yükle (force=true: askıdaki yüklemeyi iptal edip yeniden başlat)
      if (userId) {
        console.log('handleAuthResult: Loading data for userId:', userId)
        await loadData(userId, true) // force=true
      }

      suppressAuthNav.current = false
      router.replace('/(tabs)')
    } catch (error: any) {
      suppressAuthNav.current = false
      Alert.alert('Oturum Hatası', 'Giriş yapılamadı: ' + error.message)
      setLoading(false)
    }
  }

  // URL'den tokenları ayıklayan yardımcı
  const extractTokensFromUrl = (url: string) => {
    const params: Record<string, string> = {}
    
    // Hash ve Query kısımlarını tarıyoruz
    const parts = url.replace('#', '&').replace('?', '&').split('&')
    parts.forEach(part => {
      const [key, value] = part.split('=')
      if (key && value) params[key] = value
    })

    return {
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>✓</Text>
          </View>
          <Text style={styles.logoText}>ÖDEV TAKİP</Text>
          <Text style={styles.logoSubtext}>
            Öğretmenler için akıllı ödev yönetimi
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isSignUp ? 'Hesap Oluştur' : 'Tekrar Hoş Geldiniz'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-POSTA</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ŞİFRE</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
            </View>
          </View>

          {!isSignUp && (
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Şifremi Unuttum</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Hesap Oluştur' : 'Giriş Yap'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#1e293b" />
            <Text style={styles.googleButtonText}>Google ile Devam Et</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Zaten hesabınız var mı? Giriş yap'
                : 'Hesabınız yok mu? Hemen katılın'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  logoIconText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 32,
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    gap: 12,
  },
  googleButtonText: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 32,
    padding: 8,
  },
  switchText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
})
