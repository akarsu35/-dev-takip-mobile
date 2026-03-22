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
import { useTheme } from '../../constants/Colors'

export default function HistoryScreen() {
  const theme = useTheme()
  const STATUS_LABELS = useMemo(() => ({
    [HomeworkStatus.DONE]: { label: 'Tamam', color: theme.success, icon: 'checkmark-circle' },
    [HomeworkStatus.MISSING]: { label: 'Yapmadı', color: theme.error, icon: 'close-circle' },
    [HomeworkStatus.INCOMPLETE]: { label: 'Eksik', color: theme.warning, icon: 'alert-circle' },
    [HomeworkStatus.ABSENT]: { label: 'Gelmedi', color: theme.primary, icon: 'ban' },
    [HomeworkStatus.NOT_BROUGHT]: { label: 'Getirmedi', color: theme.info, icon: 'archive' },
    [HomeworkStatus.PENDING]: { label: 'Bekliyor', color: theme.textMuted, icon: 'time-outline' },
  }), [theme])
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {isLoading ? (
        <>
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Yükleniyor...</Text>
          </View>
          <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />
        </>
      ) : selectedStudent && stats ? (
        <>
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => {
              setSelectedStudentId(null)
              setFilterStatus('ALL')
            }}>
              <Ionicons name="chevron-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <View style={styles.studentHeaderInfo}>
              <Text style={[styles.studentName, { color: theme.text }]} numberOfLines={1}>
                {selectedStudent.name}
              </Text>
              <Text style={[styles.studentClass, { color: theme.textMuted }]}>{selectedStudent.className}</Text>
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
                <Ionicons name="share-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (selectedStudent.parentPhone) {
                    Linking.openURL(`tel:${selectedStudent.parentPhone}`)
                  }
                }}
              >
                <Ionicons name="call-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statsContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRowContent}>
              <View style={[styles.statChip, { backgroundColor: theme.primaryLight, borderColor: theme.borderStrong }]}>
                <Text style={[styles.statLabel, { color: theme.primary }]}>BAŞARI</Text>
                <Text style={[styles.statCount, { color: theme.primary }]}>%{successRate}</Text>
              </View>


              {stats.map(({ status, count }) => {
                const cfg = STATUS_LABELS[status]
                const isActive = filterStatus === status
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statChip,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      isActive && { backgroundColor: cfg.color, borderColor: cfg.color },
                    ]}
                    onPress={() => setFilterStatus(filterStatus === status ? 'ALL' : status)}
                  >
                    <Text style={[styles.statLabel, { color: theme.textMuted }, isActive && { color: '#fff' }]}>
                      {cfg.label}
                    </Text>
                    <Text style={[styles.statCount, { color: theme.text }, isActive && { color: '#fff' }]}>{count}</Text>
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
                    containerStyle: { borderRadius: 24, backgroundColor: theme.surface, paddingBottom: 20 },
                    titleTextStyle: { color: theme.text },
                    messageTextStyle: { color: theme.textMuted },
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
                <View key={hw.id} style={[styles.hwRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hwTitle, { color: theme.text }]}>{hw.title}</Text>
                    <Text style={[styles.hwDate, { color: theme.textLight }]}>{new Date(hw.assignedDate).toLocaleDateString('tr-TR')}</Text>
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
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.screenTitle, { color: theme.primary }]}>Gelişim Takibi</Text>
          </View>
          <View style={[styles.searchSection, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
            <Ionicons name="search-outline" size={20} color={theme.textLight} style={styles.searchIcon} />
            <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Öğrenci ara..." placeholderTextColor={theme.textLight} value={search} onChangeText={setSearch} />
          </View>
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 16 }}>
            {students.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => {
                const relevant = homeworks.filter(h => h.targetStudentIds?.includes(s.id) || h.targetClasses.includes(s.className))
                const done = relevant.filter(h => h.submissions[s.id] === HomeworkStatus.DONE).length
                const rate = relevant.length > 0 ? Math.round((done / relevant.length) * 100) : 0
                return (
                  <TouchableOpacity key={s.id} style={[styles.studentRow, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setSelectedStudentId(s.id)}>
                    <View style={[styles.avatar, { backgroundColor: rate >= 70 ? theme.success : rate >= 40 ? theme.warning : theme.danger }]}>
                      <Text style={styles.avatarText}>{s.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, { color: theme.text }]}>{s.name}</Text>
                      <Text style={[styles.studentMeta, { color: theme.textMuted }]}>{s.className} • {relevant.length} ödev</Text>
                    </View>
                    <Text style={[styles.rate, { color: rate >= 70 ? theme.success : rate >= 40 ? theme.warning : theme.danger }]}>{rate}%</Text>
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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  screenTitle: { fontSize: 20, fontWeight: '900' },
  studentHeaderInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontSize: 16, fontWeight: '800' },
  studentClass: { fontSize: 12, fontWeight: '600' },
  statsContainer: { paddingVertical: 8, borderBottomWidth: 1 },
  statsRowContent: { paddingHorizontal: 16, gap: 8 },
  statChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, alignItems: 'center', minWidth: 60 },
  statLabel: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  statCount: { fontSize: 14, fontWeight: '900' },
  searchSection: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  list: { flex: 1 },
  studentRow: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 12, marginBottom: 8, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  studentMeta: { fontSize: 12 },
  rate: { fontSize: 16, fontWeight: '900' },
  hwRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  hwTitle: { fontSize: 14, fontWeight: '700' },
  hwDate: { fontSize: 11 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
});
