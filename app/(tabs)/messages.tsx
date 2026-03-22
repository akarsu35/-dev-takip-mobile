import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Linking,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native'
import { useStore } from '../../store/useStore'
import { HomeworkStatus } from '../../types'
import { supabase } from '../../lib/supabase'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { Ionicons } from '@expo/vector-icons'

const STATUS_EMOJIS: Record<HomeworkStatus, string> = {
  [HomeworkStatus.DONE]: '✅',
  [HomeworkStatus.MISSING]: '❌',
  [HomeworkStatus.INCOMPLETE]: '⚠️',
  [HomeworkStatus.ABSENT]: '🚫',
  [HomeworkStatus.NOT_BROUGHT]: '📦',
  [HomeworkStatus.PENDING]: '⏳',
}

export default function MessagesScreen() {
  const { students, homeworks, messages, addMessage, deleteMessage, deleteAllMessages, loadData } = useStore()
  const [refreshing, setRefreshing] = useState(false)
  const { showActionSheetWithOptions } = useActionSheet()
  const [search, setSearch] = useState('')
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
  
  // Custom message modal states
  const [isModalVisible, setModalVisible] = useState(false)
  const [modalText, setModalText] = useState('')
  const [activeStudent, setActiveStudent] = useState<any>(null)

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const hasMessages = messages.some(m => m.studentId === s.id)
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase())
      return hasMessages && matchesSearch
    })
  }, [students, search, messages])

  const generateStudentSummary = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    if (!student) return ''
    const relevant = homeworks
      .filter(
        (h) =>
          h.targetStudentIds?.includes(studentId) ||
          h.targetClasses.includes(student.className),
      )
      .slice(0, 5)

    if (relevant.length === 0) return `Sayın ${student.parentName},\n\nŞu anda ${student.name}'ın aktif bir ödevi bulunmamaktadır.`

    const lines = relevant.map((h) => {
      const st = h.submissions[studentId] || HomeworkStatus.PENDING
      return `${STATUS_EMOJIS[st]} ${h.title}`
    })
    return `Sayın ${student.parentName},\n\n${student.name}'ın güncel ödev durumu:\n\n${lines.join('\n')}\n\nBilginize sunarız.`
  }

  const handleSendMessage = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    if (!student?.parentPhone) {
      Alert.alert('Hata', 'Bu öğrencinin veli telefonu yok')
      return
    }

    const options = ['📚 Otomatik Ödev Özeti Gönder', '✍️ Yeni Özel Mesaj Yaz', 'İptal']
    const cancelButtonIndex = 2

    showActionSheetWithOptions(
      { options, cancelButtonIndex },
      (selectedIndex) => {
        if (selectedIndex === 0) {
          const msg = generateStudentSummary(studentId)
          openWhatsAppAndLog(student, msg)
        } else if (selectedIndex === 1) {
          setActiveStudent(student)
          setModalText('')
          setModalVisible(true)
        }
      }
    )
  }

  const openWhatsAppAndLog = (student: any, msg: string) => {
    let phone = student.parentPhone.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = phone.substring(1)
    if (!phone.startsWith('90') && phone.length === 10) phone = '90' + phone
    if (phone.length === 10 && phone.startsWith('5')) phone = '90' + phone

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    
    addMessage({
      studentId: student.id,
      content: msg,
      type: 'text'
    }).then(() => {
      Linking.openURL(url)
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>💬 Mesaj Geçmişi</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Öğrenci ara..."
        value={search}
        onChangeText={setSearch}
      />

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
            colors={['#7C3AED']}
            tintColor="#7C3AED"
          />
        }
      >
        {filteredStudents.map(student => {
          const isExpanded = expandedStudentId === student.id
          const studentMessages = messages.filter(m => m.studentId === student.id)
          const msgCount = studentMessages.length

          return (
            <View key={student.id} style={styles.studentCard}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedStudentId(isExpanded ? null : student.id)}
              >
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentClass}>{student.className} • {student.parentName}</Text>
                </View>
                <View style={styles.headerActions}>
                  {msgCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{msgCount}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.sendIcon}
                    onPress={() => handleSendMessage(student.id)}
                  >
                    <Text style={{ fontSize: 18 }}>💬</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.historyContainer}>
                  {msgCount === 0 ? (
                    <Text style={styles.noMsgText}>Bu veliye henüz mesaj gönderilmedi.</Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.deleteAllBtn}
                        onPress={() => {
                          Alert.alert('Tümünü Sil', 'Bu öğrenciye ait tüm mesajları silmek istiyor musunuz?', [
                            { text: 'İptal', style: 'cancel' },
                            {
                              text: 'Tümünü Sil',
                              style: 'destructive',
                              onPress: () => deleteAllMessages(student.id)
                            }
                          ])
                        }}
                      >
                        <Text style={styles.deleteAllBtnText}>🧹 Tüm Geçmişi Temizle</Text>
                      </TouchableOpacity>
                      {studentMessages.map(msg => (
                        <View key={msg.id} style={styles.msgBubble}>
                          <View style={styles.msgTextContainer}>
                            <Text style={styles.msgContent}>{msg.content}</Text>
                            <Text style={styles.msgDate}>
                              {new Date(msg.createdAt).toLocaleString('tr-TR', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteMsgBtn}
                            onPress={() => {
                              Alert.alert('Mesajı Sil', 'Bu mesajı silmek istediğinize emin misiniz?', [
                                { text: 'İptal', style: 'cancel' },
                                {
                                  text: 'Sil',
                                  style: 'destructive',
                                  onPress: () => deleteMessage(msg.id)
                                }
                              ])
                            }}
                          >
                            <Ionicons name="trash" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}
            </View>
          )
        })}
        {filteredStudents.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>
              {search ? 'Aranan isimde mesaj bulunamadı.' : 'Henüz hiç mesaj gönderilmemiş.'}
            </Text>
            <Text style={styles.emptySubText}>
              Ödevler veya Kontrol sayfasından mesaj gönderdiğinizde burada listelenir.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Custom Message Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Özel Mesaj ({activeStudent?.name})
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Veliye iletilecek mesaj..."
              multiline
              autoFocus
              value={modalText}
              onChangeText={setModalText}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSend}
                onPress={() => {
                  if (modalText.trim() && activeStudent) {
                    openWhatsAppAndLog(activeStudent, modalText)
                    setModalVisible(false)
                  }
                }}
              >
                <Text style={styles.modalBtnSendText}>Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 32, // Başlık daha aşağıda olsun diye paddingTop eklendi
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  screenTitle: { fontSize: 24, fontWeight: '900', color: '#7C3AED' },
  searchInput: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  list: { flex: 1, paddingHorizontal: 16 },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  studentClass: { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    backgroundColor: '#7C3AED', // Koyu vurgu rengi
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  sendIcon: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
  historyContainer: { backgroundColor: '#f8fafc', padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  noMsgText: { textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', paddingVertical: 12 },
  deleteAllBtn: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  deleteAllBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 13 },
  msgBubble: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  msgTextContainer: { flex: 1, paddingRight: 10 },
  msgContent: { fontSize: 14, color: '#334155', lineHeight: 20 },
  msgDate: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '500' },
  deleteMsgBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    height: 120,
    fontSize: 15,
    backgroundColor: '#f8fafc',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalBtnCancelText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
  modalBtnSend: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  modalBtnSendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 100,
    paddingHorizontal: 40
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#475569', fontWeight: '700', textAlign: 'center' },
  emptySubText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
})
