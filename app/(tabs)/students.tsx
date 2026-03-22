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
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useStore } from '../../store/useStore'
import { Student } from '../../types'
import { supabase } from '../../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as XLSX from 'xlsx'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../constants/Colors'

export default function StudentsScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { students, addStudent, deleteStudent, updateStudent, bulkAddStudents, isLoading, loadData } = useStore()
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [name, setName] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [className, setClassName] = useState('')
  const [expandedClasses, setExpandedClasses] = useState<string[]>([])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.className.toLowerCase().includes(term) ||
        s.parentName.toLowerCase().includes(term),
    )
  }, [students, search])

  const grouped = useMemo(() => {
    const map: Record<string, Student[]> = {}
    filtered.forEach((s) => {
      if (!map[s.className]) map[s.className] = []
      map[s.className].push(s)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const resetForm = () => {
    setName('')
    setParentName('')
    setParentPhone('')
    setClassName('')
    setEditingStudent(null)
  }

  const handleSubmit = async () => {
    if (!name || !className) {
      Alert.alert('Hata', 'Ad ve sınıf zorunludur')
      return
    }
    if (editingStudent) {
      await updateStudent({
        ...editingStudent,
        name,
        parentName,
        parentPhone,
        className,
      })
    } else {
      await addStudent({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        parentName,
        parentPhone,
        className,
      })
    }
    resetForm()
    setShowForm(false)
  }

  const handleEdit = (s: Student) => {
    setEditingStudent(s)
    setName(s.name)
    setParentName(s.parentName)
    setParentPhone(s.parentPhone)
    setClassName(s.className)
    setShowForm(true)
  }

  const handleDelete = (s: Student) => {
    Alert.alert('Öğrenciyi Sil', `"${s.name}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteStudent(s.id) },
    ])
  }

  const handleExcelImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
      })

      if (result.canceled || !result.assets || result.assets.length === 0) return

      const asset = result.assets[0]
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      })

      const workbook = XLSX.read(base64, { type: 'base64' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const data: any[] = XLSX.utils.sheet_to_json(worksheet)

      if (data.length === 0) {
        Alert.alert('Hata', 'Excel dosyası boş veya okunamadı.')
        return
      }

      const newStudents: Student[] = data.map((row) => {
        const findKey = (variants: string[]) => {
          return Object.keys(row).find(k => {
            const normalizedK = k.toLowerCase().replace(/[\s\W_]+/g, '');
            return variants.some(v => {
              const normalizedV = v.toLowerCase().replace(/[\s\W_]+/g, '');
              return normalizedK === normalizedV || (normalizedK.length > 3 && normalizedK.includes(normalizedV));
            });
          })
        }

        const nameKey = findKey(['Ad Soyad', 'AdSoyad', 'OgrenciName', 'Name'])
        const classKey = findKey(['Sınıf', 'Sinif', 'Class'])
        const phoneKey = findKey(['Veli Tel', 'Veli Telefon', 'GSM', 'Phone'])
        const parentKey = findKey(['Veli Adı', 'Anne', 'Baba', 'Veli', 'Parent'])

        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: nameKey ? row[nameKey]?.toString().trim() : '',
          className: classKey ? row[classKey]?.toString().trim() : '',
          parentName: parentKey ? row[parentKey]?.toString().trim() : '',
          parentPhone: phoneKey ? row[phoneKey]?.toString().trim() : '',
        }
      }).filter(s => s.name && s.className)

      if (newStudents.length === 0) {
        Alert.alert('Hata', 'Uygun formatta öğrenci verisi bulunamadı.')
        return
      }

      await bulkAddStudents(newStudents)
      Alert.alert('Başarılı', `${newStudents.length} öğrenci başarıyla eklendi.`)
    } catch (error: any) {
      console.error('Excel import error:', error)
      Alert.alert('İçe Aktarma Hatası', `Excel dosyası işlenirken hata oluştu.`)
    }
  }

  const toggleClass = (cls: string) => {
    setExpandedClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {isLoading && !refreshing ? (
        <>
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Yükleniyor...</Text>
          </View>
          <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />
        </>
      ) : (
        <>
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.screenTitle, { color: theme.primary }]}>👥 Öğrenciler</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primaryLight, borderWidth: 1, borderColor: theme.primary }]}
                onPress={handleExcelImport}
              >
                <Text style={[styles.addBtnText, { color: theme.primary }]}>📊 Excel'den Yükle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowForm(true)}
              >
                <Text style={styles.addBtnText}>+ Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.surface, borderColor: theme.borderStrong, color: theme.text }]}
            placeholder="🔍 Öğrenci ara..."
            placeholderTextColor={theme.textLight}
            value={search}
            onChangeText={setSearch}
          />
          <Text style={[styles.countText, { color: theme.textLight }]}>{students.length} öğrenci</Text>

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
            {grouped.map(([cls, classStudents]) => {
              const isExpanded = expandedClasses.includes(cls) || search.length > 0
              return (
                <View key={cls}>
                  <TouchableOpacity 
                    style={[styles.classHeader, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
                    onPress={() => toggleClass(cls)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 16, color: theme.primary, fontWeight: '800' }}>
                        {isExpanded ? '▼' : '▶'}
                      </Text>
                      <Text style={[styles.classTitle, { color: theme.text }]}>{cls} Sınıfı</Text>
                    </View>
                    <View style={[styles.classCountBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.classCountText}>{classStudents.length} Öğrenci</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {isExpanded && classStudents.map((s) => (
                    <View key={s.id} style={[styles.studentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <View style={styles.studentInfoContainer}>
                        <View style={styles.nameRow}>
                          <View style={[styles.classBadge, { backgroundColor: theme.primaryLight, borderColor: theme.borderStrong }]}>
                            <Text style={[styles.classBadgeText, { color: theme.primary }]}>{s.className}</Text>
                          </View>
                          <Text style={[styles.studentNameDisplay, { color: theme.text }]} numberOfLines={1}>
                            {s.name.toUpperCase()}
                          </Text>
                        </View>
                        
                        <View style={styles.metaRow}>
                          <View style={styles.metaItem}>
                            <Ionicons name="person-outline" size={14} color={theme.textLight} style={{ marginRight: 4 }} />
                            <Text style={[styles.metaText, { color: theme.textMuted }]} numberOfLines={1}>
                              {s.parentName || 'Belirtilmemiş'}
                            </Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="call-outline" size={14} color={theme.textLight} style={{ marginRight: 4 }} />
                            <Text style={[styles.metaText, { color: theme.textMuted }]}>
                              {s.parentPhone || '-'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => {
                            router.push({
                              pathname: '/(tabs)/history',
                              params: { studentId: s.id }
                            })
                          }}
                          style={[styles.actionBtn, { backgroundColor: theme.primaryLight }]}
                        >
                          <Ionicons name="trending-up" size={18} color={theme.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleEdit(s)}
                          style={[styles.actionBtn, { backgroundColor: theme.warning + '20' }]}
                        >
                          <Ionicons name="pencil" size={18} color={theme.warning} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(s)}
                          style={[styles.actionBtn, { backgroundColor: theme.danger + '20' }]}
                        >
                          <Ionicons name="trash" size={18} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )
            })}
            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👤</Text>
                <Text style={[styles.emptyText, { color: theme.textLight }]}>Öğrenci bulunamadı</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              <Text style={[styles.modalCancel, { color: theme.textLight }]}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingStudent ? 'Öğrenci Düzenle' : 'Yeni Öğrenci'}
            </Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Text style={[styles.modalSave, { color: theme.primary }]}>Kaydet</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            {[
              {
                label: 'ÖĞRENCİ ADI SOYADI',
                val: name,
                setVal: setName,
                placeholder: 'Ad Soyad',
              },
              {
                label: 'SINIF',
                val: className,
                setVal: setClassName,
                placeholder: 'Örn: 8/A',
              },
              {
                label: 'VELİ ADI',
                val: parentName,
                setVal: setParentName,
                placeholder: 'Veli adı',
              },
              {
                label: 'VELİ TELEFON',
                val: parentPhone,
                setVal: setParentPhone,
                placeholder: '05xx xxx xx xx',
                keyboard: 'phone-pad',
              },
            ].map(({ label, val, setVal, placeholder, keyboard }: any) => (
              <View key={label}>
                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{label}</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: theme.surface, borderColor: theme.borderStrong, color: theme.text }]}
                  value={val}
                  onChangeText={setVal}
                  placeholder={placeholder}
                  placeholderTextColor={theme.textLight}
                  keyboardType={keyboard || 'default'}
                />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
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
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: { fontWeight: '800', fontSize: 13 },
  searchInput: {
    margin: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
  },
  countText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  list: { flex: 1 },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  classTitle: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  classCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  studentCard: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
  },
  studentInfoContainer: { flex: 1, marginRight: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  classBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
  },
  classBadgeText: { fontSize: 11, fontWeight: '800' },
  studentNameDisplay: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalCancel: { fontSize: 15, fontWeight: '600' },
  modalSave: { fontSize: 15, fontWeight: '800' },
  modalBody: { flex: 1, padding: 16 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 16,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
});
