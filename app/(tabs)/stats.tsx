import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  RefreshControl,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Dimensions } from 'react-native'
import { BarChart, LineChart } from 'react-native-chart-kit'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { useStore } from '../../store/useStore'
import { HomeworkStatus } from '../../types'
import { supabase } from '../../lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../constants/Colors'

// Status labels will be defined inside the component to use theme colors

export default function StatsScreen() {
  const theme = useTheme()
  const STATUS_CONFIG = useMemo(() => ({
    [HomeworkStatus.DONE]: { label: 'Tamam', icon: 'checkmark-circle', color: theme.success },
    [HomeworkStatus.MISSING]: { label: 'Yapmadı', icon: 'close-circle', color: theme.error },
    [HomeworkStatus.INCOMPLETE]: { label: 'Eksik', icon: 'alert-circle', color: theme.warning },
    [HomeworkStatus.ABSENT]: { label: 'Gelmedi', icon: 'ban', color: theme.primary },
    [HomeworkStatus.NOT_BROUGHT]: { label: 'Getirmedi', icon: 'archive', color: theme.info },
    [HomeworkStatus.PENDING]: { label: 'Bekliyor', icon: 'time-outline', color: theme.textLight },
  }), [theme])

  const { students, homeworks, updateSubmission, addMessage, markStatusAsNotified, loadData, updateTeacherNote } = useStore()
  const [refreshing, setRefreshing] = useState(false)
  const { showActionSheetWithOptions } = useActionSheet()
  const [selectedStatus, setSelectedStatus] = useState<HomeworkStatus>(
    HomeworkStatus.MISSING,
  )
  const [search, setSearch] = useState('')
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')
  const [editingNote, setEditingNote] = useState<{
    hwId: string
    studentId: string
    studentName: string
    hwTitle: string
    currentNote: string
  } | null>(null)
  const [tempNote, setTempNote] = useState('')

  const handleStatusPress = (hw: any, studentId: string) => {
    const options = [
      'Tamam',
      'Yapmadı',
      'Eksik',
      'Gelmedi',
      'Getirmedi',
      'İptal',
    ]
    const icons = [
      <Ionicons name="checkmark-circle" size={24} color={theme.success} />,
      <Ionicons name="close-circle" size={24} color={theme.error} />,
      <Ionicons name="alert-circle" size={24} color={theme.warning} />,
      <Ionicons name="ban" size={24} color={theme.primary} />,
      <Ionicons name="archive" size={24} color={theme.info} />,
      <Ionicons name="close-outline" size={24} color={theme.textLight} />,
    ]
    const cancelButtonIndex = 5

    showActionSheetWithOptions(
      {
        options,
        icons,
        cancelButtonIndex,
        containerStyle: { 
          borderRadius: 24, 
          backgroundColor: theme.surface,
          paddingBottom: 20,
        },
        titleTextStyle: { fontWeight: '900', color: theme.text },
        textStyle: { color: theme.text, fontWeight: '600' },
      },
      (selectedIndex) => {
        let newStatus = null
        switch (selectedIndex) {
          case 0:
            newStatus = HomeworkStatus.DONE
            break
          case 1:
            newStatus = HomeworkStatus.MISSING
            break
          case 2:
            newStatus = HomeworkStatus.INCOMPLETE
            break
          case 3:
            newStatus = HomeworkStatus.ABSENT
            break
          case 4:
            newStatus = HomeworkStatus.NOT_BROUGHT
            break
        }
        if (newStatus) {
          const currentStatus = hw.submissions[studentId] || HomeworkStatus.PENDING
          const finalStatus = currentStatus === newStatus ? HomeworkStatus.PENDING : newStatus
          updateSubmission(hw.id, studentId, finalStatus)
        }
      },
    )
  }

  const sendWhatsAppMessage = (student: any, hw: any) => {
    if (!student.parentPhone) return
    const phoneDigits = student.parentPhone.replace(/\D/g, '')
    const internationalPhone = phoneDigits.length === 10 && phoneDigits.startsWith('5') 
      ? '90' + phoneDigits 
      : (phoneDigits.length === 11 && phoneDigits.startsWith('0') ? '90' + phoneDigits.slice(1) : phoneDigits)
      
    const statusLabel = STATUS_CONFIG[selectedStatus].label.toUpperCase()
    const teacherNote = hw.teacherNotes?.[student.id]
    const noteText = teacherNote ? `\n\nÖğretmen Notu: ${teacherNote}` : ''
    
    const text = `Merhaba, öğrenciniz ${student.name}'nin "${hw.title}" ödev durumu: ${statusLabel}.${noteText}\n\nBilginize sunarım.`
    const url = `whatsapp://send?phone=${internationalPhone}&text=${encodeURIComponent(text)}`
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        addMessage({ studentId: student.id, content: text, type: 'text' })
        markStatusAsNotified(hw.id, student.id, selectedStatus)
        Linking.openURL(url)
      } else {
        Alert.alert('Hata', 'WhatsApp cihazınızda yüklü değil.')
      }
    })
  }

  // Filtreleme: Seçili durumu en az bir ödevinde almış olan öğrencileri bul
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      .map((student) => {
        // Bu öğrencinin dahil olduğu ödevleri bul
        const studentHomeworks = homeworks.filter(
          (hw) =>
            hw.targetStudentIds?.includes(student.id) ||
            hw.targetClasses.includes(student.className),
        )

        // Bu ödevlerin arasından durumu "selectedStatus" olanları bul
        const statusHomeworks = studentHomeworks.filter(
          (hw) =>
            (hw.submissions[student.id] || HomeworkStatus.PENDING) ===
            selectedStatus,
        )

        return {
          ...student,
          statusHomeworks,
        }
      })
      .filter((student) => student.statusHomeworks.length > 0) // Sadece bu durumu alanlar listelensin
  }, [students, homeworks, selectedStatus, search])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.screenTitle, { color: theme.primary }]}>İstatistikler</Text>
      </View>

      <View style={[styles.searchSection, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
        <Ionicons name="search-outline" size={20} color={theme.textLight} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Öğrenci ara..."
          placeholderTextColor={theme.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={[styles.chartContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>
            {chartType === 'bar' ? 'Durum Dağılımı' : 'Başarı Trendi (%)'}
          </Text>
          <View style={[styles.chartToggle, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              onPress={() => setChartType('bar')}
              style={[styles.toggleBtn, chartType === 'bar' && { backgroundColor: theme.primary }]}
            >
              <Ionicons name="bar-chart" size={14} color={chartType === 'bar' ? '#fff' : theme.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setChartType('line')}
              style={[styles.toggleBtn, chartType === 'line' && { backgroundColor: theme.primary }]}
            >
              <Ionicons name="trending-up" size={14} color={chartType === 'line' ? '#fff' : theme.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {chartType === 'bar' ? (
          (() => {
            const stats = Object.values(HomeworkStatus).map(status => {
              let count = 0;
              homeworks.forEach(hw => {
                const rel = students.filter(s => 
                  hw.targetStudentIds?.includes(s.id) || hw.targetClasses.includes(s.className)
                );
                rel.forEach(s => {
                  if ((hw.submissions[s.id] || HomeworkStatus.PENDING) === status) count++;
                });
              });
              return { status, count, label: STATUS_CONFIG[status].label };
            });

            const data = {
              labels: stats.map(s => s.label),
              datasets: [{ data: stats.map(s => s.count) }]
            };

            return (
              <BarChart
                data={data}
                width={Dimensions.get('window').width - 48}
                height={200}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: theme.surface,
                  backgroundGradientFrom: theme.surface,
                  backgroundGradientTo: theme.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => theme.primary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                  labelColor: (opacity = 1) => theme.textMuted + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                  style: { borderRadius: 16 },
                  propsForDots: { r: '6', strokeWidth: '2', stroke: theme.primary }
                }}
                verticalLabelRotation={0}
                style={{ marginVertical: 8, borderRadius: 16 }}
                showValuesOnTopOfBars
              />
            );
          })()
        ) : (
          (() => {
            const lastHws = [...homeworks]
              .sort((a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime())
              .slice(-6)

            if (lastHws.length === 0) {
              return <Text style={{ color: theme.textLight, padding: 40 }}>Yetersiz veri</Text>
            }

            const data = {
              labels: lastHws.map(hw => hw.title.length > 6 ? hw.title.substring(0, 6) + '.' : hw.title),
              datasets: [{
                data: lastHws.map(hw => {
                  const rel = students.filter(s => hw.targetStudentIds?.includes(s.id) || hw.targetClasses.includes(s.className))
                  if (rel.length === 0) return 0
                  const done = rel.filter(s => hw.submissions[s.id] === HomeworkStatus.DONE).length
                  return Math.round((done / rel.length) * 100)
                }),
                color: (opacity = 1) => theme.primary,
                strokeWidth: 3
              }]
            }

            return (
              <LineChart
                data={data}
                width={Dimensions.get('window').width - 48}
                height={200}
                chartConfig={{
                  backgroundColor: theme.surface,
                  backgroundGradientFrom: theme.surface,
                  backgroundGradientTo: theme.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => theme.primary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                  labelColor: (opacity = 1) => theme.textMuted + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                  style: { borderRadius: 16 },
                  propsForDots: { r: '4', strokeWidth: '2', stroke: theme.primary },
                  fillShadowGradient: theme.primary,
                  fillShadowGradientOpacity: 0.1,
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            )
          })()
        )}
      </View>

      <View style={[styles.statsContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRowContent}
        >
          {Object.values(HomeworkStatus).map((status) => {
            const isActive = selectedStatus === status
            const cfg = STATUS_CONFIG[status]

            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statChip,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isActive && { borderColor: cfg.color, backgroundColor: cfg.color },
                ]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text style={[styles.statLabel, { color: theme.textMuted }, isActive && { color: '#fff' }]}>
                  <Ionicons name={cfg.icon as any} size={14} color={isActive ? '#fff' : theme.textLight} /> {cfg.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              const { data: { user } } = await supabase.auth.getUser()
              if (user) await loadData(user.id)
              setRefreshing(false)
            }}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={STATUS_CONFIG[selectedStatus].icon as any} size={64} color={theme.textLight} />
            <Text style={[styles.emptyText, { color: theme.textLight }]}>
              Bu durumda öğrenci bulunamadı
            </Text>
          </View>
        ) : (
          filteredStudents.map((student) => {
            const isExpanded = expandedStudentId === student.id
            const hwCount = student.statusHomeworks.length

            return (
              <View key={student.id} style={[styles.studentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.studentHeader}
                  onPress={() =>
                    setExpandedStudentId(isExpanded ? null : student.id)
                  }
                >
                  <View style={styles.studentInfo}>
                    <Text style={[styles.studentName, { color: theme.text }]}>{student.name}</Text>
                    <Text style={[styles.studentMeta, { color: theme.textMuted }]}>
                      {student.className} • {student.parentName}
                    </Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: STATUS_CONFIG[selectedStatus].color },
                      ]}
                    >
                      <Text style={styles.badgeText}>{hwCount}</Text>
                    </View>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color={theme.textLight} 
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.expandedContent, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                    {student.statusHomeworks.map((hw) => {
                      const cfg = STATUS_CONFIG[selectedStatus]
                      const hwBg = theme.isDark ? `${cfg.color}20` : `${cfg.color}15`
                      return (
                        <View
                          key={hw.id}
                          style={[styles.hwRow, { backgroundColor: hwBg, borderColor: cfg.color }]}
                        >
                          <View style={styles.hwDetails}>
                            <Text style={[styles.hwTitle, { color: cfg.color }]}>{hw.title}</Text>
                            <Text style={[styles.hwDate, { color: theme.textLight }]}>
                              {new Date(hw.assignedDate).toLocaleDateString(
                                'tr-TR',
                              )}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={[styles.hwActionBtn, { borderColor: cfg.color, backgroundColor: theme.surface }]}
                              onPress={() => handleStatusPress(hw, student.id)}
                            >
                              <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                            </TouchableOpacity>
                            {student.parentPhone ? (() => {
                              const isNotified = hw.notifiedSubmissions?.[student.id] === selectedStatus
                              return (
                                <TouchableOpacity
                                  style={[
                                    styles.hwActionBtn, 
                                    { borderColor: isNotified ? '#059669' : '#25D366', backgroundColor: theme.surface },
                                    isNotified && styles.hwActionBtnNotified
                                  ]}
                                  onPress={() => sendWhatsAppMessage(student, hw)}
                                >
                                  <Ionicons 
                                    name={isNotified ? "checkmark-done-circle" : "logo-whatsapp"} 
                                    size={18} 
                                    color={isNotified ? "#059669" : "#25D366"} 
                                  />
                                </TouchableOpacity>
                              )
                            })() : null}
                            <TouchableOpacity
                              style={[
                                styles.hwActionBtn, 
                                { borderColor: theme.primary, backgroundColor: theme.surface },
                                hw.teacherNotes?.[student.id] && { backgroundColor: theme.primary + '15' }
                              ]}
                              onPress={() => {
                                setEditingNote({
                                  hwId: hw.id,
                                  studentId: student.id,
                                  studentName: student.name,
                                  hwTitle: hw.title,
                                  currentNote: hw.teacherNotes?.[student.id] || ''
                                })
                                setTempNote(hw.teacherNotes?.[student.id] || '')
                              }}
                            >
                              <Ionicons 
                                name={hw.teacherNotes?.[student.id] ? "document-text" : "document-text-outline"} 
                                size={18} 
                                color={theme.primary} 
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )}
              </View>
            )
          })
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 20, fontWeight: '900' },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  chartContainer: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  chartToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  statsContainer: {
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  statsRowContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  statChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: { fontSize: 13, fontWeight: '800' },
  list: { flex: 1, paddingHorizontal: 16 },
  studentCard: {
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '800' },
  studentMeta: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  expandedContent: {
    padding: 12,
    borderTopWidth: 1,
  },
  hwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  hwDetails: { flex: 1 },
  hwTitle: { fontSize: 14, fontWeight: '800' },
  hwDate: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  hwActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hwActionBtnNotified: {
    backgroundColor: '#dcfce7',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 16 },
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
});
