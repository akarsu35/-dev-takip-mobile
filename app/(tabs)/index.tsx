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
  Modal,
} from 'react-native'
import { useStore } from '../../store/useStore'
import { HomeworkStatus } from '../../types'
import { supabase } from '../../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../constants/Colors'

export default function CheckScreen() {
  const theme = useTheme()
  const { students, homeworks, updateSubmission, isLoading, selectedHwId, setSelectedHwId, addMessage, markStatusAsNotified, loadData, updateTeacherNote } = useStore()
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const [searchStudent, setSearchStudent] = useState('')
  const [searchHomework, setSearchHomework] = useState('')
  const [editingNote, setEditingNote] = useState<{
    hwId: string
    studentId: string
    studentName: string
    hwTitle: string
    currentNote: string
  } | null>(null)
  const [tempNote, setTempNote] = useState('')

  const STATUS_CONFIG = useMemo(() => ({
    [HomeworkStatus.DONE]: {
      label: 'Tamam',
      icon: 'checkmark-circle',
      color: theme.success,
    },
    [HomeworkStatus.MISSING]: {
      label: 'Yapmadı',
      icon: 'close-circle',
      color: theme.error,
    },
    [HomeworkStatus.INCOMPLETE]: {
      label: 'Eksik',
      icon: 'alert-circle',
      color: theme.warning,
    },
    [HomeworkStatus.ABSENT]: {
      label: 'Gelmedi',
      icon: 'ban',
      color: theme.primary,
    },
    [HomeworkStatus.NOT_BROUGHT]: {
      label: 'Getirmedi',
      icon: 'archive',
      color: theme.info,
    },
    [HomeworkStatus.PENDING]: {
      label: 'Bekliyor',
      icon: 'time-outline',
      color: theme.textMuted,
    },
  }), [theme])

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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.screenTitle, { color: theme.primary }]}>Yükleniyor...</Text>
        </View>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />
      </SafeAreaView>
    )
  }

  // 2. Detail View (Selected Homework)
  if (selectedHw) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => {
              setSelectedHwId(null)
              setSearchStudent('')
              setFilter('ALL')
            }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {selectedHw.title}
          </Text>
        </View>

        <View style={[styles.statsContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRowContent}>
            {stats.map(({ status, count }) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statChip, 
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  filter === status && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                ]}
                onPress={() => setFilter(filter === status ? 'ALL' : status)}
              >
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{STATUS_CONFIG[status].label}</Text>
                <Text style={[styles.statCount, { color: theme.text }]}>{count}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.searchSection, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
          <Ionicons name="search-outline" size={20} color={theme.textLight} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Öğrenci ara..."
            placeholderTextColor={theme.textLight}
            value={searchStudent}
            onChangeText={setSearchStudent}
          />
        </View>

        <ScrollView style={styles.studentList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
          {relevantStudents.map((student) => {
            const status = selectedHw.submissions[student.id] || HomeworkStatus.PENDING
            const cfg = STATUS_CONFIG[status]
            return (
              <View key={student.id} style={[styles.studentRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.studentInfo}>
                  <View style={styles.studentNameRow}>
                    <View style={[styles.inlineClassBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '30' }]}>
                      <Text style={[styles.inlineClassBadgeText, { color: theme.primary }]}>{student.className}</Text>
                    </View>
                    <Text style={[styles.studentName, { color: theme.text }]} numberOfLines={2}>{student.name.toUpperCase()}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={12} color={theme.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>{student.parentName || 'Belirtilmemiş'}</Text>
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
                          style={[
                            styles.statusBtn, 
                            isActive ? { backgroundColor: c.color } : { backgroundColor: `${c.color}15` }
                          ]}
                          onPress={() => updateSubmission(selectedHw.id, student.id, status === st ? HomeworkStatus.PENDING : st as HomeworkStatus)}
                        >
                          <Ionicons name={c.icon as any} size={18} color={isActive ? '#fff' : c.color} />
                        </TouchableOpacity>
                      )
                    })}
                    {student.parentPhone && (() => {
                      const isNotified = selectedHw.notifiedSubmissions?.[student.id] === status
                      const waBg = isNotified ? (theme.isDark ? `${theme.success}20` : theme.successBg) : theme.overlay
                      return (
                        <TouchableOpacity 
                          onPress={() => {
                            let phone = student.parentPhone!.replace(/\D/g, '')
                            if (phone.startsWith('0')) phone = phone.substring(1)
                            if (!phone.startsWith('90') && phone.length === 10) phone = '90' + phone
                            if (phone.length === 10 && phone.startsWith('5')) phone = '90' + phone

                            const statusLabel = cfg.label.toUpperCase()
                            const teacherNote = selectedHw.teacherNotes?.[student.id]
                            const noteText = teacherNote ? `\n\nÖğretmen Notu: ${teacherNote}` : ''

                            const text = `Merhaba, öğrenciniz ${student.name}'nin "${selectedHw.title}" ödev durumu: ${statusLabel}.${noteText}\n\nBilginize sunarım.`
                            const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
                            
                            addMessage({ studentId: student.id, content: text, type: 'text' })
                            markStatusAsNotified(selectedHw.id, student.id, status)
                            Linking.openURL(url)
                          }}
                          style={[
                            styles.waBtn, 
                            { backgroundColor: waBg, borderColor: isNotified ? theme.success : theme.border },
                          ]}
                        >
                          <Ionicons 
                            name={isNotified ? "checkmark-done-circle" : "logo-whatsapp"} 
                            size={18} 
                            color={isNotified ? theme.success : "#25D366"}                           />
                         </TouchableOpacity>
                       )
                     })()}
                     <TouchableOpacity
                       style={[
                         styles.statusBtn, 
                         { backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}10` },
                         selectedHw.teacherNotes?.[student.id] && { backgroundColor: theme.primary + '30' }
                       ]}
                       onPress={() => {
                         setEditingNote({
                           hwId: selectedHw.id,
                           studentId: student.id,
                           studentName: student.name,
                           hwTitle: selectedHw.title,
                           currentNote: selectedHw.teacherNotes?.[student.id] || ''
                         })
                         setTempNote(selectedHw.teacherNotes?.[student.id] || '')
                       }}
                     >
                       <Ionicons 
                         name={selectedHw.teacherNotes?.[student.id] ? "document-text" : "document-text-outline"} 
                         size={18} 
                         color={theme.primary} 
                       />
                     </TouchableOpacity>
                   </View>
                 </ScrollView>
              </View>
            )
          })}
        </ScrollView>

        {/* Teacher Note Modal (Detail View) */}
        <Modal
          visible={!!editingNote}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingNote(null)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setEditingNote(null)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Öğretmen Notu</Text>
                <TouchableOpacity onPress={() => setEditingNote(null)}>
                  <Ionicons name="close" size={24} color={theme.textLight} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalTargetInfo}>
                <Text style={[styles.modalStudentName, { color: theme.primary }]}>{editingNote?.studentName}</Text>
                <Text style={[styles.modalHwTitle, { color: theme.textMuted }]}>{editingNote?.hwTitle}</Text>
              </View>

              <TextInput
                style={[
                  styles.noteInput, 
                  { 
                    backgroundColor: theme.background, 
                    color: theme.text,
                    borderColor: theme.borderStrong
                  }
                ]}
                multiline
                numberOfLines={4}
                placeholder="Öğrenciye özel notunuzu buraya yazın..."
                placeholderTextColor={theme.textLight}
                value={tempNote}
                onChangeText={setTempNote}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.saveNoteBtn, { backgroundColor: theme.primary }]}
                onPress={async () => {
                  if (editingNote) {
                    await updateTeacherNote(editingNote.hwId, editingNote.studentId, tempNote)
                    setEditingNote(null)
                  }
                }}
              >
                <Text style={styles.saveNoteBtnText}>Notu Kaydet</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    )
  }

  // 3. Main Dashboard View
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.screenTitle, { color: theme.primary }]}>Kontrol Paneli</Text>
        <Text style={[styles.countBadge, { color: theme.primary, backgroundColor: theme.primaryLight }]}>{homeworks.length} Ödev</Text>
      </View>

      <View style={[styles.searchSection, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
        <Ionicons name="search-outline" size={20} color={theme.textLight} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Ödev ara..."
          placeholderTextColor={theme.textLight}
          value={searchHomework}
          onChangeText={setSearchHomework}
        />
      </View>

      <View style={[styles.filterContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowContent}>
          {['ALL', ...existingClasses].map((cls) => (
            <TouchableOpacity
              key={cls}
              style={[
                styles.filterChip, 
                { backgroundColor: theme.background, borderColor: theme.borderStrong },
                classFilter === cls && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => setClassFilter(cls)}
            >
              <Text style={[
                styles.filterChipText, 
                { color: theme.textMuted },
                classFilter === cls && { color: '#fff' }
              ]}>
                {cls === 'ALL' ? 'Tümü' : cls}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
        {sortedHomeworks
          .filter((hw) => classFilter === 'ALL' || hw.targetClasses.includes(classFilter))
          .filter((hw) => hw.title.toLowerCase().includes(searchHomework.toLowerCase()))
          .map((hw) => {
            const relCount = students.filter(s => (hw.targetStudentIds || []).includes(s.id) || hw.targetClasses.includes(s.className)).length
            const doneCount = students.filter(s => ((hw.targetStudentIds || []).includes(s.id) || hw.targetClasses.includes(s.className)) && hw.submissions[s.id] === HomeworkStatus.DONE).length
            const pct = relCount > 0 ? Math.round((doneCount / relCount) * 100) : 0

            return (
              <TouchableOpacity key={hw.id} style={[styles.hwCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setSelectedHwId(hw.id)}>
                <View style={styles.hwCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hwTitle, { color: theme.text }]} numberOfLines={2}>{hw.title}</Text>
                    {hw.description ? <Text style={[styles.hwDesc, { color: theme.textMuted }]} numberOfLines={2}>{hw.description}</Text> : null}
                    <View style={styles.hwMeta}>
                      {hw.targetClasses.map(cls => (
                        <View key={cls} style={[styles.tag, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.tagText, { color: theme.primary }]}>{cls}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.hwDate, { color: theme.textLight }]}>Son teslim: {new Date(hw.dueDate).toLocaleDateString('tr-TR')}</Text>
                  </View>
                </View>
                <View style={[styles.hwActionsFooter, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={[styles.progressLabel, { color: theme.text }]}>İlerleme:</Text>
                    <Text style={[styles.progressValue, { color: theme.primary }]}>{pct}% • {doneCount}/{relCount} Tamam</Text>
                  </View>
                  <Text style={[styles.checkLink, { color: theme.primary }]}>Kontrol Et →</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        {homeworks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={64} color={theme.textLight} />
            <Text style={[styles.emptyText, { color: theme.textLight }]}>Henüz ödev oluşturulmadı</Text>
          </View>
        )}
      </ScrollView>

      {/* Teacher Note Modal */}
      <Modal
        visible={!!editingNote}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingNote(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setEditingNote(null)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Öğretmen Notu</Text>
              <TouchableOpacity onPress={() => setEditingNote(null)}>
                <Ionicons name="close" size={24} color={theme.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalTargetInfo}>
              <Text style={[styles.modalStudentName, { color: theme.primary }]}>{editingNote?.studentName}</Text>
              <Text style={[styles.modalHwTitle, { color: theme.textMuted }]}>{editingNote?.hwTitle}</Text>
            </View>

            <TextInput
              style={[
                styles.noteInput, 
                { 
                  backgroundColor: theme.background, 
                  color: theme.text,
                  borderColor: theme.borderStrong
                }
              ]}
              multiline
              numberOfLines={4}
              placeholder="Öğrenciye özel notunuzu buraya yazın..."
              placeholderTextColor={theme.textLight}
              value={tempNote}
              onChangeText={setTempNote}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.saveNoteBtn, { backgroundColor: theme.primary }]}
              onPress={async () => {
                if (editingNote) {
                  await updateTeacherNote(editingNote.hwId, editingNote.studentId, tempNote)
                  setEditingNote(null)
                }
              }}
            >
              <Text style={styles.saveNoteBtnText}>Notu Kaydet</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 20, fontWeight: '900' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', marginHorizontal: 12 },
  countBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  searchSection: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, marginHorizontal: 12, marginBottom: 12, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  filterContainer: { borderBottomWidth: 1, marginBottom: 8 },
  filterRowContent: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  filterChipActive: {},
  filterChipText: { fontSize: 13, fontWeight: '700' },
  filterChipTextActive: {},
  list: { flex: 1, paddingTop: 8 },
  hwCard: { borderRadius: 16, padding: 14, marginVertical: 5, marginHorizontal: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1 },
  hwCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  hwTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  hwDesc: { fontSize: 13, marginBottom: 8 },
  hwMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '700' },
  hwDate: { fontSize: 11, fontWeight: '500', marginTop: 4 },
  hwActionsFooter: { justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, marginTop: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  progressLabel: { fontWeight: '800', marginRight: 8, fontSize: 13 },
  progressValue: { fontWeight: '700', fontSize: 13 },
  checkLink: { fontSize: 13, fontWeight: '700' },
  statsContainer: { borderBottomWidth: 1, marginBottom: 8 },
  statsRowContent: { paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  statChip: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, minWidth: 65, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  statChipActive: {},
  statCount: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  statLabel: { fontSize: 10, fontWeight: '700' },
  studentList: { flex: 1, paddingBottom: 20 },
  studentRow: { borderRadius: 20, padding: 16, marginHorizontal: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1 },
  studentInfo: { marginBottom: 12 },
  studentNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  inlineClassBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8, borderWidth: 1 },
  inlineClassBadgeText: { fontSize: 10, fontWeight: '800' },
  studentName: { fontSize: 15, fontWeight: '800', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, fontWeight: '600' },
  statusButtonsContainer: { paddingRight: 4 },
  statusButtons: { flexDirection: 'row', gap: 8 },
  statusBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  waBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  waBtnNotified: {},
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalTargetInfo: {
    marginBottom: 20,
  },
  modalStudentName: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalHwTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  noteInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    marginBottom: 20,
  },
  saveNoteBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveNoteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
})
