import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const MENU_ITEMS = [
  {
    id: 'history',
    title: 'Gelişim Takibi',
    subtitle: 'Öğrenci bazlı ödev geçmişi',
    icon: 'trending-up-outline',
    color: '#7C3AED',
    path: '/(tabs)/history'
  },
  {
    id: 'stats',
    title: 'Genel İstatistikler',
    subtitle: 'Sınıf ve ödev başarı oranları',
    icon: 'bar-chart-outline',
    color: '#8B5CF6',
    path: '/(tabs)/stats'
  },
  {
    id: 'settings',
    title: 'Ayarlar',
    subtitle: 'Uygulama ve hesap tercihleri',
    icon: 'settings-outline',
    color: '#94a3b8',
    path: '/(tabs)/settings'
  }
]

export default function MoreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Daha Fazla</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  screenTitle: { fontSize: 24, fontWeight: '900', color: '#7C3AED' },
  content: { flex: 1 },
  grid: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  cardSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
})
