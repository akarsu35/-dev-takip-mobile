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

export default function SettingsScreen() {
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')

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
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color="#4F46E5" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>⚙️ Ayarlar</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {fullName ? fullName[0].toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{fullName || 'İsim Girilmemiş'}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        {/* Profile Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
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
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={val}
                onChangeText={setVal}
                placeholder={placeholder}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
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

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygulama</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versiyon</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan</Text>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>⭐ Premium</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🚪 Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  screenTitle: { fontSize: 20, fontWeight: '900', color: '#4F46E5' },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 28 },
  userName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  userEmail: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#4F46E5',
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
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#1e293b', fontWeight: '700' },
  premiumBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  premiumBadgeText: { color: '#d97706', fontWeight: '800', fontSize: 13 },
  logoutBtn: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '800' },
})
