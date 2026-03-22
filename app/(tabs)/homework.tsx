import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useStore } from '../../store/useStore'
import { Homework, HomeworkStatus, Student } from '../../types'
import { supabase } from '../../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { generateHomeworkReport } from '../../utils/PdfService'
import { HomeworkCard } from '../../components/HomeworkCard'
import { STATUS_LABELS } from '../../components/StatusBadge'
import { useTheme } from '../../constants/Colors'

export default function HomeworkScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { 
    students, 
    homeworks, 
    addHomework, 
    deleteHomework, 
    updateHomework, 
    isLoading, 
    loadData, 
    addMessage, 
    markStatusAsNotified,
    setSelectedHwId
  } = useStore()
  
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingHw, setEditingHw] = useState<Homework | null>(null)
  const [bildirHw, setBildirHw] = useState<Homework | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(new Date())
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showSelectionModal, setShowSelectionModal] = useState(false)
  const [selectedReportStudentIds, setSelectedReportStudentIds] = useState<string[]>([])
  const [reportClassFilter, setReportClassFilter] = useState('ALL')

  const existingClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students],
  )

  const studentsInSelectedClasses = useMemo(() => {
    if (selectedClasses.length === 0) return []
    return students
      .filter(s => selectedClasses.includes(s.className))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [students, selectedClasses])

  const filteredHomeworks = useMemo(() => {
    return homeworks
      .filter(hw => hw.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())
  }, [homeworks, searchQuery])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDueDate(new Date())
    setSelectedClasses([])
    setSelectedStudentIds([])
    setEditingHw(null)
  }

  const handleEdit = (hw: Homework) => {
    setEditingHw(hw)
    setTitle(hw.title)
    setDescription(hw.description)
    setDueDate(new Date(hw.dueDate))
    setSelectedClasses(hw.targetClasses)
    setSelectedStudentIds(hw.targetStudentIds || [])
    setShowForm(true)
  }

  const handleDelete = (hw: Homework) => {
    Alert.alert('Sil', `"${hw.title}" ödevini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteHomework(hw.id) },
    ])
  }

  const toggleClass = (cls: string) => {
    setSelectedClasses((prev) => {
      const isRemoving = prev.includes(cls)
      if (isRemoving) {
        // If removing a class, also remove students of that class from selection
        const studentsInRemovedClass = students.filter(s => s.className === cls).map(s => s.id)
        setSelectedStudentIds(ids => ids.filter(id => !studentsInRemovedClass.includes(id)))
        return prev.filter((c) => c !== cls)
      } else {
        return [...prev, cls]
      }
    })
  }

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!title.trim() || selectedClasses.length === 0) {
      Alert.alert('Hata', 'Lütfen başlık girin ve en az bir sınıf seçin.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hwData: Homework = {
      id: editingHw?.id || Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      description: description.trim(),
      assignedDate: editingHw?.assignedDate || new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      targetClasses: selectedClasses,
      targetStudentIds: selectedStudentIds,
      submissions: editingHw?.submissions || {},
      notifiedStudents: editingHw?.notifiedStudents || {},
      notifiedSubmissions: editingHw?.notifiedSubmissions || {},
      userId: user.id,
    }

    if (editingHw) {
      await updateHomework(hwData)
    } else {
      await addHomework(hwData)
    }
    setShowForm(false)
    resetForm()
  }

  const handleShareIndividualReport = async (student: Student) => {
    try {
      const fileName = `${student.name.replace(/\s+/g, '_')}_Odev_Raporu.pdf`;
      await generateHomeworkReport(homeworks, students, [student.id], fileName);
    } catch (e) {
      Alert.alert('Hata', 'Rapor oluşturulamadı.');
    }
  }

  const handleSendWA = (hw: Homework, studentId: string) => {
    const s = students.find(st => st.id === studentId)
    if (!s?.parentPhone) return
    const status = hw.submissions[s.id] || HomeworkStatus.PENDING
    const statusLabel = STATUS_LABELS[status]?.label ?? status
    
    // Robust phone formatting for Turkey
    let phone = s.parentPhone.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = phone.substring(1)
    if (!phone.startsWith('90') && phone.length === 10) phone = '90' + phone
    if (phone.length === 10 && phone.startsWith('5')) phone = '90' + phone

    const text = `Merhaba, öğrencimiz ${s.name}'nin "${hw.title}" ödev durumu: ${statusLabel.toUpperCase()}. Bilginize sunarım.`
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    
    Linking.canOpenURL(url).then(supported => {
      // NOTE: canOpenURL often returns false for https links even if WhatsApp is installed, 
      // but wa.me links are handled by the browser/OS deep linking correctly.
      addMessage({ studentId: s.id, content: text, type: 'text' })
      markStatusAsNotified(hw.id, s.id, status)
      Linking.openURL(url)
    })
  }

  const bildirStudents = useMemo(() => {
    if (!bildirHw) return []
    const hasSpecificStudents = bildirHw.targetStudentIds && bildirHw.targetStudentIds.length > 0
    return students.filter(
      s => hasSpecificStudents ? (bildirHw.targetStudentIds || []).includes(s.id) : bildirHw.targetClasses.includes(s.className)
    ).sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [bildirHw, students])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {isLoading && !refreshing ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />
      ) : (
        <>
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.screenTitle, { color: theme.primary }]}>📚 Ödevler</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: theme.background, borderColor: theme.borderStrong, borderWidth: 1 }]} 
                onPress={() => setShowSelectionModal(true)}
              >
                <Ionicons name="share-social-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={() => setShowForm(true)}>
                <Text style={styles.addBtnText}>+ Yeni Ödev</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={20} color={theme.textLight} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Ödev ara..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.textLight}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 24 }}
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
            {filteredHomeworks.map((hw) => (
              <HomeworkCard
                key={hw.id}
                hw={hw}
                students={students}
                onNotify={(selected) => setBildirHw(selected)}
                onAnalysis={(selected) => {
                  setSelectedHwId(selected.id)
                  router.push('/(tabs)')
                }}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
            {filteredHomeworks.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyText}>{searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz ödev oluşturulmadı'}</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Bildir Modal (Birebir Tasarım) */}
      <Modal visible={!!bildirHw} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.bildirTop}>
            <View style={styles.bildirHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bildirHeaderTitle}>Ödev Bildirimi</Text>
                <Text style={styles.bildirHeaderSub} numberOfLines={1}>{bildirHw?.title.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => setBildirHw(null)} style={styles.bildirClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.bildirScroll} contentContainerStyle={{ padding: 20 }}>
            {/* Stat Cards */}
            {bildirHw && (() => {
               const currentHwInModal = homeworks.find(h => h.id === bildirHw.id) || bildirHw
               const hasSpecificStudents = currentHwInModal.targetStudentIds && currentHwInModal.targetStudentIds.length > 0
               const rel = students.filter(s => hasSpecificStudents ? (currentHwInModal.targetStudentIds || []).includes(s.id) : currentHwInModal.targetClasses.includes(s.className))
               const done = rel.filter(s => currentHwInModal.submissions[s.id] === HomeworkStatus.DONE).length
               const pct = rel.length > 0 ? Math.round((done / rel.length) * 100) : 0
               return (
                <View style={styles.statCardsRow}>
                  <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={[styles.cardTag, { marginBottom: 12 }]}>
                      <Ionicons name="calendar" size={12} color={theme.primary} />
                      <Text style={[styles.cardTagText, { color: theme.textMuted }]}> TARİHLER</Text>
                    </View>
                    <View style={styles.statLine}>
                      <Text style={[styles.statKey, { color: theme.textMuted }]}>Veriliş:</Text>
                      <Text style={[styles.statVal, { color: theme.text }]}>{new Date(currentHwInModal.assignedDate).toLocaleDateString('tr-TR')}</Text>
                    </View>
                    <View style={styles.statLine}>
                      <Text style={[styles.statKey, { color: theme.textMuted }]}>Kontrol:</Text>
                      <Text style={[styles.statVal, { color: theme.primary, fontWeight: '800' }]}>{new Date(currentHwInModal.dueDate).toLocaleDateString('tr-TR')}</Text>
                    </View>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.statCardHeader}>
                      <Text style={[styles.cardTagText, { color: theme.textMuted }]}>İLERLEME DURUMU</Text>
                      <Text style={[styles.pctText, { color: theme.primary }]}>%{pct}</Text>
                    </View>
                    <Text style={[styles.progressCounter, { color: theme.text }]}>
                      {done} / {rel.length}
                    </Text>
                    <View style={[styles.pBar, { backgroundColor: theme.border }]}>
                       <View style={[styles.pFill, { width: `${pct}%` as any, backgroundColor: theme.primary }]} />
                    </View>
                  </View>
                </View>
               )
            })()}

            {/* Description */}
            <View style={[styles.descBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTagText, { color: theme.textMuted }]}>ÖDEV AÇIKLAMASI</Text>
              <Text style={[styles.descContent, { color: theme.textMuted }]}>"{bildirHw?.description || 'Açıklama belirtilmemiş'}"</Text>
            </View>

            {/* Student List */}
            <View style={styles.studentHeader}>
              <Ionicons name="people" size={16} color={theme.primary} />
              <Text style={[styles.studentLabel, { color: theme.textMuted }]}> ÖĞRENCİ LİSTESİ ({bildirStudents.length})</Text>
            </View>

            {bildirStudents.map((s) => {
              const currentHwInModal = homeworks.find(h => h.id === bildirHw?.id) || bildirHw!
              const currentStatus = currentHwInModal.submissions[s.id] || HomeworkStatus.PENDING
              const alreadyNotified = currentHwInModal.notifiedSubmissions?.[s.id] === currentStatus
              const hasPhone = !!s.parentPhone

              return (
              <View key={s.id} style={[styles.studentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sName, { color: theme.text }]}>{s.name.toUpperCase()}</Text>
                  <Text style={[styles.sMeta, { color: theme.textLight }]}>{s.className} • {s.parentName?.toUpperCase() || 'VELİ BELİRTİLMEMİŞ'}</Text>
                </View>
                <TouchableOpacity 
                   style={[
                     styles.wpBtn, 
                     { backgroundColor: theme.success, shadowColor: theme.success },
                     !hasPhone && { opacity: 0.5 },
                     alreadyNotified && { backgroundColor: theme.overlay, shadowOpacity: 0 }
                   ]} 
                   onPress={() => handleSendWA(currentHwInModal, s.id)}
                   disabled={!hasPhone || alreadyNotified}
                >
                  <Ionicons name={alreadyNotified ? "checkmark-circle" : "logo-whatsapp"} size={16} color={alreadyNotified ? theme.textLight : "#fff"} />
                  <Text style={[styles.wpBtnText, alreadyNotified && { color: theme.textLight }]}>{alreadyNotified ? 'BİLDİRİLDİ' : 'BİLDİR'}</Text>
                </TouchableOpacity>
              </View>
              )
            })}
          </ScrollView>

          <View style={[styles.bildirFooter, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TouchableOpacity style={styles.vazgec} onPress={() => setBildirHw(null)}>
              <Text style={[styles.vazgecText, { color: theme.textMuted }]}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tamamla} onPress={() => setBildirHw(null)}>
              <Text style={styles.tamamlaText}>TAMAMLA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rapor Seçim Modalı */}
      <Modal visible={showSelectionModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowSelectionModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.textLight }]}>Kapat</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Rapor Hazırla</Text>
            <TouchableOpacity 
              onPress={async () => {
                try {
                  if (selectedReportStudentIds.length > 1) {
                    // Her öğrenci için ayrı rapor paylaş
                    for (const id of selectedReportStudentIds) {
                      const student = students.find(s => s.id === id);
                      if (!student) continue;
                      const fileName = `${student.name}_Odev_Raporu.pdf`;
                      await generateHomeworkReport(homeworks, students, [id], fileName);
                    }
                  } else {
                    // Tekli veya Tümü (hiç seçilmediyse) için rapor paylaş
                    const targetIds = selectedReportStudentIds.length > 0 ? selectedReportStudentIds : undefined;
                    let fileName = undefined;
                    if (targetIds?.length === 1) {
                      const s = students.find(st => st.id === targetIds[0]);
                      if (s) fileName = `${s.name}_Odev_Raporu.pdf`;
                    }
                    await generateHomeworkReport(homeworks, students, targetIds, fileName);
                  }
                  
                  setShowSelectionModal(false);
                  setSelectedReportStudentIds([]);
                  Alert.alert("Başarılı ✅", "Seçili öğrencilerin raporları oluşturuldu.");
                } catch (e) {
                  Alert.alert('Hata', 'Rapor paylaşılırken bir hata oluştu.');
                }
              }}
            >
              <Text style={styles.modalSave}>Paylaş</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterContainerInModal}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowInModal}>
              {['ALL', ...existingClasses].map((cls) => (
                <TouchableOpacity
                  key={cls}
                  style={[
                    styles.reportFilterChip, 
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    reportClassFilter === cls && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}
                  onPress={() => setReportClassFilter(cls)}
                >
                  <Text style={[
                    styles.reportFilterText, 
                    { color: theme.textMuted },
                    reportClassFilter === cls && { color: '#fff' }
                  ]}>
                    {cls === 'ALL' ? 'Tümü' : cls}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>ÖĞRENCİ SEÇİMİ ({selectedReportStudentIds.length === 0 ? 'Tümü' : `${selectedReportStudentIds.length} Seçili`})</Text>
            <View style={styles.studentSelector}>
              {students
                .filter(s => reportClassFilter === 'ALL' || s.className === reportClassFilter)
                .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
                .map(s => {
                  const isSelected = selectedReportStudentIds.includes(s.id);
                  return (
                    <View key={s.id} style={styles.reportStudentRow}>
                      <TouchableOpacity
                        style={[
                          styles.studentChipInReport, 
                          { backgroundColor: theme.surface, borderColor: theme.borderStrong },
                          isSelected && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                        ]}
                        onPress={() => {
                          setSelectedReportStudentIds(prev => 
                            prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          );
                        }}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Ionicons name="checkmark" size={10} color="#fff" />}
                        </View>
                        <Text style={[
                          styles.studentChipText, 
                          { color: theme.textMuted },
                          isSelected && { color: theme.text, fontWeight: '700' }
                        ]} numberOfLines={1}>
                          {s.name} ({s.className})
                        </Text>
                      </TouchableOpacity>
                      
                      {s.parentPhone && (
                        <TouchableOpacity 
                          style={[styles.modalWaBtn, { backgroundColor: theme.overlay, borderColor: theme.border }]}
                          onPress={() => handleShareIndividualReport(s)}
                        >
                          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Text style={[styles.modalCancel, { color: theme.textLight }]}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingHw ? 'Ödevi Düzenle' : 'Yeni Ödev'}</Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Text style={styles.modalSave}>Kaydet</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>ÖDEV BAŞLIĞI</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: theme.surface, borderColor: theme.borderStrong, color: theme.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Örn: Kareköklü Sayılar Test-1"
              placeholderTextColor={theme.textLight}
            />

            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>AÇIKLAMA (OPSİYONEL)</Text>
            <TextInput
              style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', backgroundColor: theme.surface, borderColor: theme.borderStrong, color: theme.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ödev detayları..."
              placeholderTextColor={theme.textLight}
              multiline
            />

            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>SINIF SEÇİMİ</Text>
            <View style={styles.classSelector}>
              {existingClasses.map(cls => {
                const isSelected = selectedClasses.includes(cls)
                return (
                  <TouchableOpacity
                    key={cls}
                    style={[
                      styles.classChip, 
                      { backgroundColor: theme.surface, borderColor: theme.borderStrong },
                      isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => toggleClass(cls)}
                  >
                    <Text style={[
                      styles.classChipText, 
                      { color: theme.textMuted },
                      isSelected && { color: '#fff' }
                    ]}>{cls}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {selectedClasses.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>
                  ÖĞRENCİ SEÇİMİ (İSTEĞE BAĞLI - BOŞSA TÜM SINIF)
                </Text>
                <View style={styles.studentSelector}>
                  {studentsInSelectedClasses.map(s => {
                    const isSelected = selectedStudentIds.includes(s.id)
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.studentChip, 
                          { backgroundColor: theme.surface, borderColor: theme.borderStrong },
                          isSelected && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                        ]}
                        onPress={() => toggleStudent(s.id)}
                      >
                        <View style={[styles.checkbox, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                          {isSelected && <Ionicons name="checkmark" size={10} color="#fff" />}
                        </View>
                        <Text style={[
                          styles.studentChipText, 
                          { color: theme.textMuted },
                          isSelected && { color: theme.text, fontWeight: '700' }
                        ]}>
                          {s.name} ({s.className})
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </>
            )}

            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>SON TESLİM TARİHİ</Text>
            <TouchableOpacity style={[styles.datePickerBtn, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar" size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.datePickerText, { color: theme.text }]}>{dueDate.toLocaleDateString('tr-TR')}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios')
                  if (selectedDate) setDueDate(selectedDate)
                }}
              />
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  screenTitle: { fontSize: 20, fontWeight: '900', color: '#7C3AED' },
  addBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: '#f1f5f9' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#1e293b', fontWeight: '600' },

  list: { flex: 1 },
  hwCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginHorizontal: 16, marginTop: 16, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9' },
  hwHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  hwTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  classTag: { backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#DDD6FE' },
  classTagText: { fontSize: 10, fontWeight: '800', color: '#7C3AED' },
  actionRow: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8, borderRadius: 10, backgroundColor: '#f8fafc' },
  hwDesc: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 12 },
  hwFooter: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  footerDate: { flexDirection: 'row', alignItems: 'center' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressText: { fontSize: 12, color: '#7C3AED', fontWeight: '700' },
  footerBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4, height: 32 },
  footerBtnText: { fontSize: 12, fontWeight: '700' },
  footerIconBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dueDateText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  
  // Bildir Modal Styles
  bildirTop: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  bildirHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  bildirHeaderTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  bildirHeaderSub: { color: '#E0E7FF', fontSize: 13, fontWeight: '700', opacity: 0.9 },
  bildirClose: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 },
  bildirScroll: { flex: 1 },
  statCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTag: { flexDirection: 'row', alignItems: 'center', opacity: 0.6 },
  cardTagText: { fontSize: 9, fontWeight: '800', color: '#1e293b', letterSpacing: 1 },
  statLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  statKey: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statVal: { fontSize: 12, color: '#1e293b', fontWeight: '700' },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pctText: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  progressCounter: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 12 },
  pBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  pFill: { height: '100%', backgroundColor: '#7C3AED' },
  descBlock: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 25 },
  descContent: { fontSize: 14, color: '#64748b', marginTop: 8, fontStyle: 'italic', lineHeight: 20 },
  studentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  studentLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  studentCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  sName: { fontSize: 14, color: '#1e293b', fontWeight: '800', marginBottom: 4 },
  sMeta: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  wpBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  wpBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  bildirFooter: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  vazgec: { paddingHorizontal: 20, paddingVertical: 12 },
  vazgecText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  tamamla: { backgroundColor: '#4F46E5', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  tamamlaText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  modal: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  modalCancel: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
  modalSave: { fontSize: 15, color: '#7C3AED', fontWeight: '800' },
  modalBody: { flex: 1, padding: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8, marginTop: 20 },
  fieldInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b', backgroundColor: '#fff' },
  classSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  classChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  classChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  classChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  classChipTextActive: { color: '#fff' },
  
  studentSelector: { marginTop: 8, gap: 8 },
  studentChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0' },
  studentChipActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#cbd5e1', marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  studentChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  studentChipTextActive: { color: '#1e293b', fontWeight: '700' },

  datePickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginTop: 4, backgroundColor: '#fff' },
  datePickerText: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#94a3b8', fontWeight: '600' },

  filterContainerInModal: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 8 },
  filterRowInModal: { paddingHorizontal: 16, gap: 8 },
  reportFilterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  reportFilterChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  reportFilterText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  reportFilterTextActive: { color: '#fff' },

  reportStudentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  studentChipInReport: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0' },
  modalWaBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bbf7d0' },
})
