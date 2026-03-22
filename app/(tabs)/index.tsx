import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native'
import { useStore } from '../../store/useStore'
import { HomeworkStatus } from '../../types'
import { supabase } from '../../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

const STATUS_CONFIG = {
  [HomeworkStatus.DONE]: {
    label: 'Tamam',
    icon: 'checkmark-circle',
    color: '#10b981',
    bg: '#d1fae5',
  },
  [HomeworkStatus.MISSING]: {
    label: 'Yapmadı',
    icon: 'close-circle',
    color: '#ef4444',
    bg: '#fee2e2',
  },
  [HomeworkStatus.INCOMPLETE]: {
    label: 'Eksik',
    icon: 'alert-circle',
    color: '#f59e0b',
    bg: '#fef3c7',
  },
  [HomeworkStatus.ABSENT]: {
    label: 'Gelmedi',
    icon: 'ban',
    color: '#8b5cf6',
    bg: '#ede9fe',
  },
  [HomeworkStatus.NOT_BROUGHT]: {
    label: 'Getirmedi',
    icon: 'archive',
    color: '#3b82f6',
    bg: '#dbeafe',
  },
  [HomeworkStatus.PENDING]: {
    label: 'Bekliyor',
    icon: 'time-outline',
    color: '#94a3b8',
    bg: '#f1f5f9',
  },
}

export default function CheckScreen() {
  const { students, homeworks, updateSubmission, isLoading, selectedHwId, setSelectedHwId, addMessage, markStatusAsNotified, loadData } = useStore()
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const [searchStudent, setSearchStudent] = useState('')
  const [searchHomework, setSearchHomework] = useState('')

  const existingClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students],
  )

  const sortedHomeworks = useMemo(
    () =>
      [...homeworks].sort(
        (a, b) =>
          new Date(b.assignedDate).getTime() -
          new Date(a.assignedDate).getTime(),
      ),
    [homeworks],
  )

  const selectedHw = useMemo(() => homeworks.find((h) => h.id === selectedHwId), [homeworks, selectedHwId])

  // Stats for selected homework
  const stats = useMemo(() => {
    if (!selectedHw) return []
    const baseStudents = students.filter((s) =>
      (selectedHw.targetStudentIds || []).includes(s.id) ||
      selectedHw.targetClasses.includes(s.className),
    )
    return Object.values(HomeworkStatus)
      .map((st) => ({
        status: st,
        count: baseStudents.filter(
          (s) => (selectedHw.submissions[s.id] || HomeworkStatus.PENDING) === st,
        ).length,
      }))
      .filter((s) => s.count > 0 || s.status === HomeworkStatus.DONE)
  }, [selectedHw, students])

  // Relevant students for selected homework
  const relevantStudents = useMemo(() => {
    if (!selectedHw) return []
    return students
      .filter((s) =>
        (selectedHw.targetStudentIds || []).includes(s.id) ||
        selectedHw.targetClasses.includes(s.className),
      )
      .filter((s) => s.name.toLowerCase().includes(searchStudent.toLowerCase()))
      .filter(
        (s) =>
          filter === 'ALL' ||
          (selectedHw.submissions[s.id] || HomeworkStatus.PENDING) === filter,
      )
  }, [selectedHw, students, searchStudent, filter])

  const onRefresh = async () => {
    setRefreshing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await loadData(user.id)
    setRefreshing(false)
  }

  // --- CONTENT RENDERING ---

  // 1. Loading State (Shell logic to prevent hook order errors)
  if (isLoading && !refreshing && !selectedHwId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.screenTitle}>Yükleniyor...</Text>
        </View>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#7C3AED" />
      </SafeAreaView>
    )
  }

  // 2. Detail View (Selected Homework)
  if (selectedHw) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setSelectedHwId(null)
              setSearchStudent('')
              setFilter('ALL')
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#7C3AED" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedHw.title}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRowContent}>
            {stats.map(({ status, count }) => (
              <TouchableOpacity
                key={status}
                style={[styles.statChip, filter === status && styles.statChipActive]}
                onPress={() => setFilter(filter === status ? 'ALL' : status)}
              >
                <Text style={styles.statLabel}>{STATUS_CONFIG[status].label}</Text>
                <Text style={styles.statCount}>{count}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.searchSection}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Öğrenci ara..."
            value={searchStudent}
            onChangeText={setSearchStudent}
          />
        </View>

        <ScrollView style={styles.studentList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} tintColor="#7C3AED" />}>
          {relevantStudents.map((student) => {
            const status = selectedHw.submissions[student.id] || HomeworkStatus.PENDING
            const cfg = STATUS_CONFIG[status]
            return (
              <View key={student.id} style={styles.studentRow}>
                <View style={styles.studentInfo}>
                  <View style={styles.studentNameRow}>
                    <View style={styles.inlineClassBadge}><Text style={styles.inlineClassBadgeText}>{student.className}</Text></View>
                    <Text style={styles.studentName} numberOfLines={2}>{student.name.toUpperCase()}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{student.parentName || 'Belirtilmemiş'}</Text>
                  </View>
                </View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusButtonsContainer}>
                  <View style={styles.statusButtons}>
                    {Object.keys(STATUS_CONFIG).filter(s => s !== HomeworkStatus.PENDING).map((st) => {
                      const c = STATUS_CONFIG[st as HomeworkStatus]
                      const isActive = status === st
                      return (
                        <TouchableOpacity
                          key={st}
                          style={[styles.statusBtn, isActive ? { backgroundColor: c.color } : { backgroundColor: `${c.color}15` }]}
                          onPress={() => updateSubmission(selectedHw.id, student.id, status === st ? HomeworkStatus.PENDING : st as HomeworkStatus)}
                        >
                          <Ionicons name={c.icon as any} size={18} color={isActive ? '#fff' : c.color} />
                        </TouchableOpacity>
                      )
                    })}
                    {student.parentPhone && (() => {
                      const isNotified = selectedHw.notifiedSubmissions?.[student.id] === status
                      return (
                        <TouchableOpacity 
                          onPress={() => {
                            let phone = student.parentPhone!.replace(/\D/g, '')
                            if (phone.startsWith('0')) phone = phone.substring(1)
                            if (!phone.startsWith('90') && phone.length === 10) phone = '90' + phone
                            if (phone.length === 10 && phone.startsWith('5')) phone = '90' + phone

                            const text = `Merhaba, öğrenciniz ${student.name}'nin "${selectedHw.title}" ödev durumu: ${cfg.label.toUpperCase()}. Bilginize sunarım.`
                            const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
                            
                            addMessage({ studentId: student.id, content: text, type: 'text' })
                            markStatusAsNotified(selectedHw.id, student.id, status)
                            Linking.openURL(url)
                          }}
                          style={[styles.waBtn, isNotified && styles.waBtnNotified]}
                        >
                          <Ionicons name={isNotified ? "checkmark-done-circle" : "logo-whatsapp"} size={18} color={isNotified ? "#059669" : "#25D366"} />
                        </TouchableOpacity>
                      )
                    })()}
                  </View>
                </ScrollView>
              </View>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // 3. Main Dashboard View
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Kontrol Paneli</Text>
        <Text style={styles.countBadge}>{homeworks.length} Ödev</Text>
      </View>

      <View style={styles.searchSection}>
        <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ödev ara..."
          value={searchHomework}
          onChangeText={setSearchHomework}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowContent}>
          {['ALL', ...existingClasses].map((cls) => (
            <TouchableOpacity
              key={cls}
              style={[styles.filterChip, classFilter === cls && styles.filterChipActive]}
              onPress={() => setClassFilter(cls)}
            >
              <Text style={[styles.filterChipText, classFilter === cls && styles.filterChipTextActive]}>
                {cls === 'ALL' ? 'Tümü' : cls}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} tintColor="#7C3AED" />}>
        {sortedHomeworks
          .filter((hw) => classFilter === 'ALL' || hw.targetClasses.includes(classFilter))
          .filter((hw) => hw.title.toLowerCase().includes(searchHomework.toLowerCase()))
          .map((hw) => {
            const relCount = students.filter(s => (hw.targetStudentIds || []).includes(s.id) || hw.targetClasses.includes(s.className)).length
            const doneCount = students.filter(s => ((hw.targetStudentIds || []).includes(s.id) || hw.targetClasses.includes(s.className)) && hw.submissions[s.id] === HomeworkStatus.DONE).length
            const pct = relCount > 0 ? Math.round((doneCount / relCount) * 100) : 0

            return (
              <TouchableOpacity key={hw.id} style={styles.hwCard} onPress={() => setSelectedHwId(hw.id)}>
                <View style={styles.hwCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hwTitle} numberOfLines={2}>{hw.title}</Text>
                    {hw.description ? <Text style={styles.hwDesc} numberOfLines={2}>{hw.description}</Text> : null}
                    <View style={styles.hwMeta}>{hw.targetClasses.map(cls => <View key={cls} style={styles.tag}><Text style={styles.tagText}>{cls}</Text></View>)}</View>
                    <Text style={styles.hwDate}>Son teslim: {new Date(hw.dueDate).toLocaleDateString('tr-TR')}</Text>
                  </View>
                </View>
                <View style={styles.hwActionsFooter}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.progressLabel}>İlerleme:</Text>
                    <Text style={styles.progressValue}>{pct}% • {doneCount}/{relCount} Tamam</Text>
                  </View>
                  <Text style={styles.checkLink}>Kontrol Et →</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        {homeworks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Henüz ödev oluşturulmadı</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  screenTitle: { fontSize: 20, fontWeight: '900', color: '#7C3AED' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1e293b', marginHorizontal: 12 },
  countBadge: { fontSize: 12, fontWeight: '700', color: '#7C3AED', backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, marginHorizontal: 12, marginBottom: 12, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  filterContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 8 },
  filterRowContent: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  filterChipTextActive: { color: '#fff' },
  list: { flex: 1, paddingTop: 8 },
  hwCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginVertical: 5, marginHorizontal: 12, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  hwCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  hwTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  hwDesc: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  hwMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  tag: { backgroundColor: '#F5F3FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  hwDate: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 4 },
  hwActionsFooter: { justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  progressLabel: { fontWeight: '800', color: '#1e293b', marginRight: 8, fontSize: 13 },
  progressValue: { fontWeight: '700', color: '#7C3AED', fontSize: 13 },
  checkLink: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  statsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 8 },
  statsRowContent: { paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  statChip: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#f1f5f9', minWidth: 65, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  statChipActive: { backgroundColor: '#F5F3FF', borderColor: '#7C3AED' },
  statCount: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginTop: 2 },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  studentList: { flex: 1, paddingBottom: 20 },
  studentRow: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginHorizontal: 12, marginBottom: 12, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  studentInfo: { marginBottom: 12 },
  studentNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  inlineClassBadge: { backgroundColor: '#F5F3FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: '#DDD6FE' },
  inlineClassBadgeText: { fontSize: 10, fontWeight: '800', color: '#7C3AED' },
  studentName: { fontSize: 15, fontWeight: '800', color: '#0F172A', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  statusButtonsContainer: { paddingRight: 4 },
  statusButtons: { flexDirection: 'row', gap: 8 },
  statusBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  waBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#bbf7d0' },
  waBtnNotified: { backgroundColor: '#dcfce7' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#94a3b8', fontWeight: '600', marginTop: 12 },
})
