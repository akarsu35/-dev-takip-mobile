import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useStore } from '../../store/useStore'
import { HomeworkStatus } from '../../types'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { generateHomeworkReport } from '../../utils/PdfService'

const STATUS_LABELS = {
  [HomeworkStatus.DONE]: { label: 'Tamam', color: '#10b981', icon: 'checkmark-circle' },
  [HomeworkStatus.MISSING]: { label: 'Yapmadı', color: '#ef4444', icon: 'close-circle' },
  [HomeworkStatus.INCOMPLETE]: { label: 'Eksik', color: '#f59e0b', icon: 'alert-circle' },
  [HomeworkStatus.ABSENT]: { label: 'Gelmedi', color: '#8b5cf6', icon: 'ban' },
  [HomeworkStatus.NOT_BROUGHT]: { label: 'Getirmedi', color: '#3b82f6', icon: 'archive' },
  [HomeworkStatus.PENDING]: { label: 'Bekliyor', color: '#94a3b8', icon: 'time-outline' },
}

export default function HistoryScreen() {
  const { students, homeworks, isLoading, addMessage, markStatusAsNotified } = useStore()
  const { showActionSheetWithOptions } = useActionSheet()
  const { studentId: paramStudentId } = useLocalSearchParams<{ studentId?: string }>()
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  // Sınıflar sayfasından gelen studentId parametresini yakala
  useEffect(() => {
    if (paramStudentId) {
      setSelectedStudentId(paramStudentId)
      setFilterStatus('ALL')
    }
  }, [paramStudentId])

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId],
  )

  const studentHomeworks = useMemo(() => {
    if (!selectedStudentId) return []
    const s = students.find(st => st.id === selectedStudentId)
    if (!s) return []
    return homeworks
      .filter(
        (h) =>
          h.targetStudentIds?.includes(selectedStudentId) ||
          h.targetClasses.includes(s.className),
      )
      .sort(
        (a, b) =>
          new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime(),
      )
  }, [homeworks, selectedStudentId, students])

  const stats = useMemo(() => {
    if (!selectedStudentId) return null
    return Object.values(HomeworkStatus).map((status) => ({
      status,
      count: studentHomeworks.filter(
        (h) => (h.submissions[selectedStudentId] || HomeworkStatus.PENDING) === status,
      ).length,
    })).filter(s => s.count > 0 || s.status === HomeworkStatus.DONE)
  }, [studentHomeworks, selectedStudentId])

  const successRate = useMemo(() => {
    if (studentHomeworks.length === 0) return 0
    const done = studentHomeworks.filter(
      (h) => h.submissions[selectedStudentId!] === HomeworkStatus.DONE,
    ).length
    return Math.round((done / studentHomeworks.length) * 100)
  }, [studentHomeworks, selectedStudentId])

  // --- RENDER ---
  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <>
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Yükleniyor...</Text>
          </View>
          <ActivityIndicator style={{ flex: 1 }} size="large" color="#7C3AED" />
        </>
      ) : selectedStudent && stats ? (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              setSelectedStudentId(null)
              setFilterStatus('ALL')
            }}>
              <Ionicons name="chevron-back" size={24} color="#7C3AED" />
            </TouchableOpacity>
            <View style={styles.studentHeaderInfo}>
              <Text style={styles.studentName} numberOfLines={1}>
                {selectedStudent.name}
              </Text>
              <Text style={styles.studentClass}>{selectedStudent.className}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const fileName = `${selectedStudent.name}_Odev_Raporu.pdf`;
                    await generateHomeworkReport(homeworks, students, [selectedStudent.id], fileName);
                  } catch (e) {
                    Alert.alert('Hata', 'Rapor oluşturulamadı.');
                  }
                }}
              >
                <Ionicons name="share-outline" size={24} color="#7C3AED" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (selectedStudent.parentPhone) {
                    Linking.openURL(`tel:${selectedStudent.parentPhone}`)
                  }
                }}
              >
                <Ionicons name="call-outline" size={24} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRowContent}>
              <View style={[styles.statChip, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                <Text style={[styles.statLabel, { color: '#7C3AED' }]}>BAŞARI</Text>
                <Text style={[styles.statCount, { color: '#7C3AED' }]}>%{successRate}</Text>
              </View>

              {stats.map(({ status, count }) => {
                const cfg = STATUS_LABELS[status]
                const isActive = filterStatus === status
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statChip,
                      isActive && { backgroundColor: cfg.color, borderColor: cfg.color },
                    ]}
                    onPress={() => setFilterStatus(filterStatus === status ? 'ALL' : status)}
                  >
                    <Text style={[styles.statLabel, isActive && { color: '#fff' }]}>
                      {cfg.label}
                    </Text>
                    <Text style={[styles.statCount, isActive && { color: '#fff' }]}>{count}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 16 }}>
            {studentHomeworks
              .filter((hw) => {
                if (filterStatus === 'ALL') return true
                const status = hw.submissions[selectedStudentId!] || HomeworkStatus.PENDING
                return status === filterStatus
              })
              .map((hw) => {
              const status = hw.submissions[selectedStudentId!] || HomeworkStatus.PENDING
              const cfg = STATUS_LABELS[status]

              const handleStatusPress = () => {
                const options = ['İptal', 'Tamam', 'Eksik', 'Yapmadı', 'Getirmedi', 'Gelmedi', 'Bekliyor']
                showActionSheetWithOptions({
                    options,
                    cancelButtonIndex: 0,
                    containerStyle: { borderRadius: 24, backgroundColor: '#ffffff', paddingBottom: 20 },
                }, (index) => {
                    let newStat: HomeworkStatus | null = null
                    if (index === 1) newStat = HomeworkStatus.DONE
                    else if (index === 2) newStat = HomeworkStatus.INCOMPLETE
                    else if (index === 3) newStat = HomeworkStatus.MISSING
                    else if (index === 4) newStat = HomeworkStatus.NOT_BROUGHT
                    else if (index === 5) newStat = HomeworkStatus.ABSENT
                    else if (index === 6) newStat = HomeworkStatus.PENDING

                    if (newStat) {
                        useStore.getState().updateSubmission(hw.id, selectedStudentId!, newStat)
                    }
                })
              }

              return (
                <View key={hw.id} style={styles.hwRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hwTitle}>{hw.title}</Text>
                    <Text style={styles.hwDate}>{new Date(hw.assignedDate).toLocaleDateString('tr-TR')}</Text>
                  </View>
                  <TouchableOpacity onPress={handleStatusPress} style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                    <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                    <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </ScrollView>
        </>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Gelişim Takibi</Text>
          </View>
          <View style={styles.searchSection}>
            <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Öğrenci ara..." value={search} onChangeText={setSearch} />
          </View>
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 16 }}>
            {students.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => {
                const relevant = homeworks.filter(h => h.targetStudentIds?.includes(s.id) || h.targetClasses.includes(s.className))
                const done = relevant.filter(h => h.submissions[s.id] === HomeworkStatus.DONE).length
                const rate = relevant.length > 0 ? Math.round((done / relevant.length) * 100) : 0
                return (
                  <TouchableOpacity key={s.id} style={styles.studentRow} onPress={() => setSelectedStudentId(s.id)}>
                    <View style={[styles.avatar, { backgroundColor: rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444' }]}>
                      <Text style={styles.avatarText}>{s.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{s.name}</Text>
                      <Text style={styles.studentMeta}>{s.className} • {relevant.length} ödev</Text>
                    </View>
                    <Text style={[styles.rate, { color: rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444' }]}>{rate}%</Text>
                  </TouchableOpacity>
                )
            })}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  screenTitle: { fontSize: 20, fontWeight: '900', color: '#7C3AED' },
  studentHeaderInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  studentClass: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statsContainer: { backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  statsRowContent: { paddingHorizontal: 16, gap: 8 },
  statChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', minWidth: 60, backgroundColor: '#fff' },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 2 },
  statCount: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  list: { flex: 1 },
  studentRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  studentMeta: { fontSize: 12, color: '#64748b' },
  rate: { fontSize: 16, fontWeight: '900' },
  hwRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  hwTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  hwDate: { fontSize: 11, color: '#94a3b8' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
})
