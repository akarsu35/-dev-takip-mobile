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
import { useTheme } from '../../constants/Colors'

const STATUS_EMOJIS: Record<HomeworkStatus, string> = {
  [HomeworkStatus.DONE]: '✅',
  [HomeworkStatus.MISSING]: '❌',
  [HomeworkStatus.INCOMPLETE]: '⚠️',
  [HomeworkStatus.ABSENT]: '🚫',
  [HomeworkStatus.NOT_BROUGHT]: '📦',
  [HomeworkStatus.PENDING]: '⏳',
}

export default function MessagesScreen() {
  const theme = useTheme()
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
      { 
        options, 
        cancelButtonIndex,
        containerStyle: { borderRadius: 24, backgroundColor: theme.surface, paddingBottom: 20 },
        titleTextStyle: { color: theme.text },
        messageTextStyle: { color: theme.textMuted },
      },
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.screenTitle, { color: theme.primary }]}>💬 Mesaj Geçmişi</Text>
      </View>

      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.surface, borderColor: theme.borderStrong, color: theme.text }]}
        placeholder="🔍 Öğrenci ara..."
        placeholderTextColor={theme.textLight}
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
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {filteredStudents.map(student => {
          const isExpanded = expandedStudentId === student.id
          const studentMessages = messages.filter(m => m.studentId === student.id)
          const msgCount = studentMessages.length

          return (
            <View key={student.id} style={[styles.studentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedStudentId(isExpanded ? null : student.id)}
              >
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: theme.text }]}>{student.name}</Text>
                  <Text style={[styles.studentClass, { color: theme.textMuted }]}>{student.className} • {student.parentName}</Text>
                </View>
                <View style={styles.headerActions}>
                  {msgCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.badgeText}>{msgCount}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.sendIcon, { backgroundColor: theme.background }]}
                    onPress={() => handleSendMessage(student.id)}
                  >
                    <Text style={{ fontSize: 18 }}>💬</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.historyContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                  {msgCount === 0 ? (
                    <Text style={[styles.noMsgText, { color: theme.textMuted }]}>Bu veliye henüz mesaj gönderilmedi.</Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.deleteAllBtn, { backgroundColor: theme.danger + '10', borderColor: theme.danger + '30' }]}
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
                        <Text style={[styles.deleteAllBtnText, { color: theme.danger }]}>🧹 Tüm Geçmişi Temizle</Text>
                      </TouchableOpacity>
                      {studentMessages.map(msg => (
                        <View key={msg.id} style={[styles.msgBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <View style={styles.msgTextContainer}>
                            <Text style={[styles.msgContent, { color: theme.text }]}>{msg.content}</Text>
                            <Text style={[styles.msgDate, { color: theme.textLight }]}>
                              {new Date(msg.createdAt).toLocaleString('tr-TR', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.deleteMsgBtn, { backgroundColor: theme.danger + '10' }]}
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
                            <Ionicons name="trash" size={16} color={theme.danger} />
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
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {search ? 'Aranan isimde mesaj bulunamadı.' : 'Henüz hiç mesaj gönderilmemiş.'}
            </Text>
            <Text style={[styles.emptySubText, { color: theme.textLight }]}>
              Ödevler veya Kontrol sayfasından mesaj gönderdiğinizde burada listelenir.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Custom Message Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Özel Mesaj ({activeStudent?.name})
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Veliye iletilecek mesaj..."
              placeholderTextColor={theme.textLight}
              multiline
              autoFocus
              value={modalText}
              onChangeText={setModalText}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { backgroundColor: theme.background }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalBtnCancelText, { color: theme.textMuted }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSend, { backgroundColor: theme.primary }]}
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
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 24, fontWeight: '900' },
  searchInput: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  list: { flex: 1, paddingHorizontal: 16 },
  studentCard: {
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700' },
  studentClass: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  sendIcon: { padding: 8, borderRadius: 10 },
  historyContainer: { padding: 16, borderTopWidth: 1 },
  noMsgText: { textAlign: 'center', fontStyle: 'italic', paddingVertical: 12 },
  deleteAllBtn: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteAllBtnText: { fontWeight: '800', fontSize: 13 },
  msgBubble: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  msgTextContainer: { flex: 1, paddingRight: 10 },
  msgContent: { fontSize: 14, lineHeight: 20 },
  msgDate: { fontSize: 11, marginTop: 6, fontWeight: '500' },
  deleteMsgBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    height: 120,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancelText: { fontWeight: '700', fontSize: 15 },
  modalBtnSend: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
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
  emptyText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySubText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
