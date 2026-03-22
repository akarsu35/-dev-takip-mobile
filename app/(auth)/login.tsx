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
import { useTheme } from '../../constants/Colors'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const theme = useTheme()
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
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: false,
        },
      })

      if (error) throw error
      
      if (data?.url) {
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
      Alert.alert('Giriş Hatası', 'Google ile giriş yapılamadı.')
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
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Önce veriyi yükle (force=true: askıdaki yüklemeyi iptal edip yeniden başlat)
      if (userId) {
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
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoIcon, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
            <Text style={styles.logoIconText}>✓</Text>
          </View>
          <Text style={[styles.logoText, { color: theme.text }]}>ÖDEV TAKİP</Text>
          <Text style={[styles.logoSubtext, { color: theme.textMuted }]}>
            Öğretmenler için akıllı ödev yönetimi
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {isSignUp ? 'Hesap Oluştur' : 'Tekrar Hoş Geldiniz'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textMuted }]}>E-POSTA</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.borderStrong }]}>
              <Ionicons name="mail-outline" size={20} color={theme.textLight} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor={theme.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textMuted }]}>ŞİFRE</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.borderStrong }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textLight} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.textLight}
                secureTextEntry
              />
            </View>
          </View>

          {!isSignUp && (
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={[styles.forgotText, { color: theme.primary }]}>Şifremi Unuttum</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary, shadowColor: theme.primary }, loading && styles.buttonDisabled]}
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
            <View style={[styles.line, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textLight }]}>veya</Text>
            <View style={[styles.line, { backgroundColor: theme.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={theme.text} />
            <Text style={[styles.googleButtonText, { color: theme.text }]}>Google ile Devam Et</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={[styles.switchText, { color: theme.textMuted }]}>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    borderRadius: 30,
    padding: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 32,
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
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
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '700',
  },
  googleButton: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 32,
    padding: 8,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
