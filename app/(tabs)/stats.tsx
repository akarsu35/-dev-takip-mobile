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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Dimensions } from 'react-native'
import { BarChart } from 'react-native-chart-kit'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { useStore } from '../../store/useStore'
import { HomeworkStatus } from '../../types'
import { supabase } from '../../lib/supabase'
import { Ionicons } from '@expo/vector-icons'

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; bg: string }
> = {
  [HomeworkStatus.DONE]: {
    label: 'Tamam',
    icon: 'checkmark-circle',
    color: '#10b981',
    bg: '#ecfdf5',
  },
  [HomeworkStatus.MISSING]: {
    label: 'Yapmadı',
    icon: 'close-circle',
    color: '#ef4444',
    bg: '#fef2f2',
  },
  [HomeworkStatus.INCOMPLETE]: {
    label: 'Eksik',
    icon: 'alert-circle',
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  [HomeworkStatus.ABSENT]: {
    label: 'Gelmedi',
    icon: 'ban',
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  [HomeworkStatus.NOT_BROUGHT]: {
    label: 'Getirmedi',
    icon: 'archive',
    color: '#3b82f6',
    bg: '#eff6ff',
  },
  [HomeworkStatus.PENDING]: {
    label: 'Bekliyor',
    icon: 'time-outline',
    color: '#94a3b8',
    bg: '#f8fafc',
  },
}

export default function StatsScreen() {
  const { students, homeworks, updateSubmission, addMessage, markStatusAsNotified, loadData } = useStore()
  const [refreshing, setRefreshing] = useState(false)
  const { showActionSheetWithOptions } = useActionSheet()
  const [selectedStatus, setSelectedStatus] = useState<HomeworkStatus>(
    HomeworkStatus.MISSING,
  )
  const [search, setSearch] = useState('')
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)

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
      <Ionicons name="checkmark-circle" size={24} color="#10b981" />,
      <Ionicons name="close-circle" size={24} color="#ef4444" />,
      <Ionicons name="alert-circle" size={24} color="#f59e0b" />,
      <Ionicons name="ban" size={24} color="#8b5cf6" />,
      <Ionicons name="archive" size={24} color="#3b82f6" />,
      <Ionicons name="close-outline" size={24} color="#94a3b8" />,
    ]
    const cancelButtonIndex = 5

    showActionSheetWithOptions(
      {
        options,
        icons,
        cancelButtonIndex,
        containerStyle: { 
          borderRadius: 24, 
          backgroundColor: '#ffffff',
          paddingBottom: 20, // Alt tuşlardan uzaklaştırmak için
        },
        titleTextStyle: { fontWeight: '900', color: '#1e293b' },
        textStyle: { color: '#334155', fontWeight: '600' },
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
    const text = `Merhaba, öğrenciniz ${student.name}'nin "${hw.title}" ödev durumu: ${statusLabel}. Bilginize sunarım.`
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>İstatistikler</Text>
      </View>

      <View style={styles.searchSection}>
        <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Öğrenci ara..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.chartContainer}>
        {(() => {
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
              width={Dimensions.get('window').width - 32}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: '6', strokeWidth: '2', stroke: '#7C3AED' }
              }}
              verticalLabelRotation={0}
              style={{ marginVertical: 8, borderRadius: 16 }}
              showValuesOnTopOfBars
            />
          );
        })()}
      </View>

      <View style={styles.statsContainer}>
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
                  isActive && { borderColor: cfg.color, backgroundColor: cfg.bg },
                ]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text style={[styles.statLabel, isActive && { color: cfg.color }]}>
                  <Ionicons name={cfg.icon as any} size={14} color={isActive ? cfg.color : '#64748b'} /> {cfg.label}
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
            colors={['#7C3AED']}
            tintColor="#7C3AED"
          />
        }
      >
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={STATUS_CONFIG[selectedStatus].icon as any} size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>
              Bu durumda öğrenci bulunamadı
            </Text>
          </View>
        ) : (
          filteredStudents.map((student) => {
            const isExpanded = expandedStudentId === student.id
            const hwCount = student.statusHomeworks.length

            return (
              <View key={student.id} style={styles.studentCard}>
                <TouchableOpacity
                  style={styles.studentHeader}
                  onPress={() =>
                    setExpandedStudentId(isExpanded ? null : student.id)
                  }
                >
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentMeta}>
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
                      color="#94a3b8" 
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {student.statusHomeworks.map((hw) => {
                      const cfg = STATUS_CONFIG[selectedStatus]
                      return (
                        <View
                          key={hw.id}
                          style={[styles.hwRow, { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                        >
                          <View style={styles.hwDetails}>
                            <Text style={[styles.hwTitle, { color: cfg.color }]}>{hw.title}</Text>
                            <Text style={styles.hwDate}>
                              {new Date(hw.assignedDate).toLocaleDateString(
                                'tr-TR',
                              )}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={[styles.hwActionBtn, { borderColor: cfg.color }]}
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
                                    { borderColor: isNotified ? '#059669' : '#25D366' },
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
  screenTitle: { fontSize: 20, fontWeight: '900', color: '#7C3AED' },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  list: { flex: 1, paddingHorizontal: 16 },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
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
  studentName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  studentMeta: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
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
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  hwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  hwDetails: { flex: 1 },
  hwTitle: { fontSize: 14, fontWeight: '800' },
  hwDate: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '600' },
  hwActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5, // Biraz daha belirgin olsun
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  hwActionBtnNotified: {
    backgroundColor: '#dcfce7',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: { fontSize: 16, color: '#94a3b8', fontWeight: '700', marginTop: 16 },
})
