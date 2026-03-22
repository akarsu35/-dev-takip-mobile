import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/Colors'
import { useStore } from '../../store/useStore'
import { Ionicons } from '@expo/vector-icons'

export default function SettingsScreen() {
  const theme = useTheme()
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const { themePreference, setThemePreference } = useStore()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUserEmail(user.email || '')
      const { data } = await supabase
        .from('UserProfile')
        .select('*')
        .eq('userId', user.id)
        .single()
      if (data) {
        setFullName(data.fullName || '')
        setSchoolName(data.schoolName || '')
        setSubject(data.subject || '')
      }
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date().toISOString()
    const { error } = await supabase.from('UserProfile').upsert({
      id: user.id, // UserProfile tablosunda id alanı zorunlu ve genellikle user.id ile aynıdır
      userId: user.id,
      fullName: fullName,
      schoolName: schoolName,
      subject: subject,
      createdAt: now,
      updatedAt: now,
    })

    setSaving(false)
    if (error) {
      Alert.alert('Hata', 'Profil kaydedilemedi')
    } else {
      Alert.alert('Başarılı', 'Profil güncellendi ✓')
    }
  }

  const handleLogout = async () => {
    Alert.alert('Çıkış', 'Hesabınızdan çıkmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.screenTitle, { color: theme.primary }]}>⚙️ Ayarlar</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.avatarLarge, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {fullName ? fullName[0].toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>{fullName || 'İsim Girilmemiş'}</Text>
          <Text style={[styles.userEmail, { color: theme.textMuted }]}>{userEmail}</Text>
        </View>

        {/* Profile Form */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Profil Bilgileri</Text>
          {[
            {
              label: 'AD SOYAD',
              val: fullName,
              setVal: setFullName,
              placeholder: 'Adınız ve soyadınız',
            },
            {
              label: 'OKUL',
              val: schoolName,
              setVal: setSchoolName,
              placeholder: 'Okul adı',
            },
            {
              label: 'BRANŞ',
              val: subject,
              setVal: setSubject,
              placeholder: 'Matematik, Türkçe...',
            },
          ].map(({ label, val, setVal, placeholder }) => (
            <View key={label} style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.background, borderColor: theme.borderStrong, color: theme.text }]}
                value={val}
                onChangeText={setVal}
                placeholder={placeholder}
                placeholderTextColor={theme.textLight}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>💾 Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Appearance Control */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Görünüm Teması</Text>
          <View style={styles.themeToggleContainer}>
            {[
              { id: 'light', label: 'Açık', icon: 'sunny-outline' },
              { id: 'dark', label: 'Koyu', icon: 'moon-outline' },
              { id: 'system', label: 'Sistem', icon: 'settings-outline' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: theme.background, borderColor: theme.borderStrong },
                  themePreference === item.id && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => setThemePreference(item.id as any)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={themePreference === item.id ? '#fff' : theme.textMuted}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: theme.textMuted },
                    themePreference === item.id && { color: '#fff' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Uygulama</Text>
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Versiyon</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Plan</Text>
            <View style={[styles.premiumBadge, { backgroundColor: theme.warning + '20' }]}>
              <Text style={[styles.premiumBadgeText, { color: theme.warning }]}>⭐ Premium</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.danger + '10', borderColor: theme.danger + '30' }]} onPress={handleLogout}>
          <Text style={[styles.logoutBtnText, { color: theme.danger }]}>🚪 Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 20, fontWeight: '900' },
  profileCard: {
    alignItems: 'center',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 28 },
  userName: { fontSize: 18, fontWeight: '800' },
  userEmail: { fontSize: 13, marginTop: 4 },
  section: {
    margin: 16,
    marginTop: 0,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
  },
  saveBtn: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 14, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '700' },
  premiumBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  premiumBadgeText: { fontWeight: '800', fontSize: 13 },
  logoutBtn: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutBtnText: { fontSize: 15, fontWeight: '800' },
  themeToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
