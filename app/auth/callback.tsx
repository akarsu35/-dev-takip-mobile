import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../constants/Colors';

export default function AuthCallback() {
  const theme = useTheme();
  const router = useRouter();
  const loadData = useStore((s) => s.loadData);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;
    let finalTimeout: ReturnType<typeof setTimeout>;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Veriyi önce yükle (force=true: askıdaki yüklemeyi iptal edip yeniden başlat)
          await loadData(session.user.id, true)
          router.replace('/(tabs)');
        } else {
          // Supabase'in session'ı işlemesi için tekrar dene
          retryTimeout = setTimeout(checkSession, 1000);

          // 10 saniye sonra hala yoksa login'e geri dön
          finalTimeout = setTimeout(() => {
            router.replace('/(auth)/login');
          }, 10000);
        }
      } catch (err) {
        console.error('AuthCallback error:', err);
        router.replace('/(auth)/login');
      }
    };

    checkSession();

    return () => {
      clearTimeout(retryTimeout);
      clearTimeout(finalTimeout);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.text, { color: theme.textMuted }]}>Oturum açılıyor...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
});
