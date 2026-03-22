import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Student, Homework, HomeworkStatus, Message } from '../types'
import { supabase } from '../lib/supabase'

interface StoreState {
  students: Student[]
  homeworks: Homework[]
  messages: Message[]
  isLoading: boolean
  activeTab: string
  selectedHwId: string | null
  themePreference: 'light' | 'dark' | 'system'

  setActiveTab: (tab: string) => void
  setSelectedHwId: (id: string | null) => void
  setThemePreference: (pref: 'light' | 'dark' | 'system') => void
  setStudents: (s: Student[]) => void
  setHomeworks: (h: Homework[]) => void
  setMessages: (m: Message[]) => void
  loadData: (userId: string, force?: boolean) => Promise<void>

  // Student actions
  addStudent: (s: Student) => Promise<void>
  bulkAddStudents: (students: Student[]) => Promise<void>
  deleteStudent: (id: string) => Promise<void>
  updateStudent: (s: Student) => Promise<void>

  // Homework actions
  addHomework: (h: Homework) => Promise<void>
  deleteHomework: (id: string) => Promise<void>
  updateHomework: (h: Homework) => Promise<void>
  updateSubmission: (
    hwId: string,
    studentId: string,
    status: HomeworkStatus,
  ) => Promise<void>
  markAsNotified: (hwId: string, studentId: string) => Promise<void>
  markStatusAsNotified: (hwId: string, studentId: string, status: HomeworkStatus) => Promise<void>
  updateTeacherNote: (hwId: string, studentId: string, note: string) => Promise<void>

  // Messages Actions
  addMessage: (m: Omit<Message, 'id' | 'createdAt'>) => Promise<void>
  deleteMessage: (id: string) => Promise<void>
  deleteAllMessages: (studentId: string) => Promise<void>
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
  students: [],
  homeworks: [],
  messages: [],
  isLoading: false,
  activeTab: 'check',
  selectedHwId: null,
  themePreference: 'system',

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedHwId: (id) => set({ selectedHwId: id }),
  setThemePreference: (pref) => set({ themePreference: pref }),
  setStudents: (students) => set({ students }),
  setHomeworks: (homeworks) => set({ homeworks }),
  setMessages: (messages) => set({ messages }),

  loadData: async (userId: string, force = false) => {
    if (!userId) return
    // Çift çağrı önleme: zaten yükleniyor ise atla (force=true ile bypass edilebilir)
    if (get().isLoading && !force) {
      console.log('loadData: Already loading, skipping duplicate call.')
      return
    }
    if (force) {
      console.log('loadData: Force reload — cancelling any pending load.')
      set({ isLoading: false }) // Askıdaki yüklemeyi iptal et
    }
    console.log('loadData: Fetching for userId:', userId)
    set({ isLoading: true })

    // Safety timeout: 60 saniye (2 deneme + bekleme süresi)
    const timeout = setTimeout(() => {
      if (get().isLoading) {
        console.warn('loadData: Safety timeout triggered!')
        set({ isLoading: false })
      }
    }, 60000)

    const runQueries = async () => {
      console.log('loadData: Starting queries...')

      const [studentsRes, homeworksRes, messagesRes] = await Promise.all([
        supabase.from('Student').select('*').eq('userId', userId),
        supabase.from('Homework').select('*').eq('userId', userId),
        supabase.from('SentMessage').select('*').eq('userId', userId).order('createdAt', { ascending: false }),
      ])

      console.log('loadData: Student:', studentsRes.error?.message ?? 'ok', '|', studentsRes.data?.length ?? 0, 'rows')
      console.log('loadData: Homework:', homeworksRes.error?.message ?? 'ok', '|', homeworksRes.data?.length ?? 0, 'rows')
      console.log('loadData: SentMessage:', messagesRes.error?.message ?? 'ok', '|', messagesRes.data?.length ?? 0, 'rows')

      const hwIds = homeworksRes.data?.map((h: any) => h.id) ?? []
      let submissionsRes: { data: any[] | null; error: any } = { data: [], error: null }
      if (hwIds.length > 0) {
        submissionsRes = await supabase.from('Submission').select('*').in('homeworkId', hwIds)
        console.log('loadData: Submission:', submissionsRes.error?.message ?? 'ok', '|', submissionsRes.data?.length ?? 0, 'rows')
      } else {
        console.log('loadData: No homeworks, skipping Submission query.')
      }

      return { studentsRes, homeworksRes, messagesRes, submissionsRes }
    }

    try {
      let result: Awaited<ReturnType<typeof runQueries>>

      try {
        result = await runQueries()
      } catch (firstError: any) {
        // İlk deneme başarısız (cold start timeout) — 3 saniye bekle ve tekrar dene
        console.warn('loadData: First attempt failed:', firstError?.message, '— Retrying in 3s...')
        await new Promise(r => setTimeout(r, 3000))
        console.log('loadData: Retrying...')
        result = await runQueries()
      }

      const { studentsRes, homeworksRes, messagesRes, submissionsRes } = result

      if (studentsRes.error) console.error('Students fetch error:', studentsRes.error)
      if (homeworksRes.error) console.error('Homeworks fetch error:', homeworksRes.error)
      if (messagesRes.error) console.error('Messages fetch error:', messagesRes.error)

      if (studentsRes.data) {
        const students: Student[] = studentsRes.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          parentName: s.parentName,
          parentPhone: s.parentPhone,
          className: s.className,
          userId: s.userId,
        }))
        set({ students })
      }

      if (homeworksRes.data) {
        const submissionMap: Record<string, Record<string, HomeworkStatus>> = {}
        const teacherNoteMap: Record<string, Record<string, string>> = {}
        if (submissionsRes.data) {
          submissionsRes.data.forEach((s: any) => {
            if (!submissionMap[s.homeworkId]) {
              submissionMap[s.homeworkId] = {}
            }
            if (!teacherNoteMap[s.homeworkId]) {
              teacherNoteMap[s.homeworkId] = {}
            }
            submissionMap[s.homeworkId][s.studentId] = s.status as HomeworkStatus
            if (s.teacherNote) {
              teacherNoteMap[s.homeworkId][s.studentId] = s.teacherNote
            }
          })
        }

        const homeworks: Homework[] = homeworksRes.data.map((h: any) => ({
          id: h.id,
          title: h.title,
          description: h.description || '',
          assignedDate: h.assignedDate,
          dueDate: h.dueDate,
          targetClasses: h.targetClasses || [],
          targetStudentIds: h.targetStudentIds || [],
          submissions: submissionMap[h.id] || {},
          teacherNotes: teacherNoteMap[h.id] || {},
          notifiedStudents: h.notifiedStudents || {},
          notifiedSubmissions: h.notifiedSubmissions || {},
          userId: h.userId,
        }))
        set({ homeworks })
      }

      if (messagesRes.data) {
        const messages: Message[] = messagesRes.data.map((m: any) => ({
          id: m.id,
          studentId: m.studentId,
          content: m.content,
          type: m.type,
          createdAt: m.createdAt
        }))
        set({ messages })
      }
    } catch (error) {
      console.error('loadData error (both attempts failed):', error)
    } finally {
      clearTimeout(timeout)
      console.log('loadData: Finished')
      set({ isLoading: false })
    }
  },


  addStudent: async (student: Student) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Önce state'e ekle (optimistic)
    set((state) => ({ students: [...state.students, student] }))

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('Student')
      .insert({
        id: student.id,
        name: student.name,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        className: student.className,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      })

    if (error) {
      // Hata olursa geri al
      set((state) => ({
        students: state.students.filter((s) => s.id !== student.id),
      }))
      console.error('addStudent error:', error)
    }
  },

  bulkAddStudents: async (newStudents: Student[]) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const prevStudents = get().students
    set((state) => ({ students: [...state.students, ...newStudents] }))

    const now = new Date().toISOString()
    const rows = newStudents.map(s => ({
      id: s.id,
      name: s.name,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      className: s.className,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
    }))

    const { error } = await supabase
      .from('Student')
      .insert(rows)

    if (error) {
      set({ students: prevStudents })
      console.error('bulkAddStudents error:', error)
      throw error
    }
  },

  deleteStudent: async (id: string) => {
    const prev = get().students
    set((state) => ({ students: state.students.filter((s) => s.id !== id) }))
    const { error } = await supabase.from('Student').delete().eq('id', id)
    if (error) set({ students: prev })
  },

  updateStudent: async (student: Student) => {
    set((state) => ({
      students: state.students.map((s) => (s.id === student.id ? student : s)),
    }))
    await supabase
      .from('Student')
      .update({
        name: student.name,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        className: student.className,
      })
      .eq('id', student.id)
  },

  addHomework: async (homework: Homework) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date().toISOString()
    const { error } = await supabase.from('Homework').insert({
      id: homework.id,
      title: homework.title,
      description: homework.description,
      assignedDate: homework.assignedDate,
      dueDate: homework.dueDate,
      targetClasses: homework.targetClasses,
      targetStudentIds: homework.targetStudentIds || [],
      submissions: homework.submissions,
      notifiedStudents: homework.notifiedStudents || {},
      notifiedSubmissions: homework.notifiedSubmissions || {},
      userId: user.id,
      createdAt: now,
      updatedAt: now,
    })

    if (!error) {
      set((state) => ({ homeworks: [...state.homeworks, homework] }))
    } else {
      console.error('addHomework error:', error)
    }
  },

  deleteHomework: async (id: string) => {
    const prev = get().homeworks
    set((state) => ({ homeworks: state.homeworks.filter((h) => h.id !== id) }))
    const { error } = await supabase.from('Homework').delete().eq('id', id)
    if (error) set({ homeworks: prev })
  },

  updateHomework: async (homework: Homework) => {
    set((state) => ({
      homeworks: state.homeworks.map((h) =>
        h.id === homework.id ? homework : h,
      ),
    }))
    const { error } = await supabase
      .from('Homework')
      .update({
        title: homework.title,
        description: homework.description,
        dueDate: homework.dueDate,
        targetClasses: homework.targetClasses,
        targetStudentIds: homework.targetStudentIds || [],
        submissions: homework.submissions,
        notifiedStudents: homework.notifiedStudents || {},
        notifiedSubmissions: homework.notifiedSubmissions || {},
      })
      .eq('id', homework.id)

    if (error) {
      console.error('updateHomework Supabase error:', error)
    }
  },

  updateSubmission: async (
    hwId: string,
    studentId: string,
    status: HomeworkStatus,
  ) => {
    const hw = get().homeworks.find((h) => h.id === hwId)
    if (!hw) return

    const updatedSubmissions = { ...hw.submissions, [studentId]: status }
    const updatedHw = { ...hw, submissions: updatedSubmissions }

    set((state) => ({
      homeworks: state.homeworks.map((h) => (h.id === hwId ? updatedHw : h)),
    }))

    const { data, error } = await supabase
      .from('Submission')
      .upsert({ 
        id: `${hwId}-${studentId}`, // Provide a deterministic ID to satisfy NOT NULL constraint
        homeworkId: hwId, 
        studentId: studentId, 
        status: status,
        updatedAt: new Date().toISOString()
      }, {
        onConflict: 'homeworkId,studentId'
      })
      .select()

    if (error) {
      console.error('updateSubmission Supabase error:', error)
      // Geri al (Rollback state)
      set((state) => ({
        homeworks: state.homeworks.map((h) => (h.id === hwId ? hw : h)),
      }))
    }
  },

  markAsNotified: async (hwId: string, studentId: string) => {
    const hw = get().homeworks.find((h) => h.id === hwId)
    if (!hw) return
    const updatedNotified = { ...(hw.notifiedStudents || {}), [studentId]: true }
    set((state) => ({
      homeworks: state.homeworks.map((h) => {
        if (h.id !== hwId) return h
        return { ...h, notifiedStudents: updatedNotified }
      }),
    }))
    await supabase
      .from('Homework')
      .update({ notifiedStudents: updatedNotified })
      .eq('id', hwId)
  },
  
  markStatusAsNotified: async (hwId: string, studentId: string, status: HomeworkStatus) => {
    const hw = get().homeworks.find((h) => h.id === hwId)
    if (!hw) return
    const updatedNotified = { ...(hw.notifiedSubmissions || {}), [studentId]: status }
    set((state) => ({
      homeworks: state.homeworks.map((h) => {
        if (h.id !== hwId) return h
        return { ...h, notifiedSubmissions: updatedNotified }
      }),
    }))
    await supabase
      .from('Homework')
      .update({ notifiedSubmissions: updatedNotified })
      .eq('id', hwId)
  },

  updateTeacherNote: async (hwId: string, studentId: string, note: string) => {
    const hw = get().homeworks.find((h) => h.id === hwId)
    if (!hw) return

    const updatedNotes = { ...(hw.teacherNotes || {}), [studentId]: note }
    const updatedHw = { ...hw, teacherNotes: updatedNotes }

    set((state) => ({
      homeworks: state.homeworks.map((h) => (h.id === hwId ? updatedHw : h)),
    }))

    const currentStatus = hw.submissions[studentId] || HomeworkStatus.PENDING
    const { error } = await supabase
      .from('Submission')
      .upsert({ 
        id: `${hwId}-${studentId}`, 
        homeworkId: hwId, 
        studentId: studentId, 
        status: currentStatus,
        teacherNote: note,
        updatedAt: new Date().toISOString()
      }, {
        onConflict: 'homeworkId,studentId'
      })

    if (error) {
      console.error('updateTeacherNote Supabase error:', error)
      // Rollback
      set((state) => ({
        homeworks: state.homeworks.map((h) => (h.id === hwId ? hw : h)),
      }))
    }
  },

  addMessage: async (messageData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date().toISOString()
    const tempId = `msg-${Date.now()}`
    const newMessage: Message = {
      id: tempId,
      ...messageData,
      createdAt: now
    }

    set((state) => ({ messages: [newMessage, ...state.messages] }))

    const { error } = await supabase.from('SentMessage').insert({
      id: tempId,
      studentId: messageData.studentId,
      content: messageData.content,
      type: messageData.type,
      userId: user.id,
      createdAt: now
    })

    if (error) {
      console.error('addMessage DB error:', error)
    }
  },

  deleteMessage: async (id: string) => {
    const prev = get().messages
    set((state) => ({ messages: state.messages.filter(m => m.id !== id) }))
    const { error } = await supabase.from('SentMessage').delete().eq('id', id)
    if (error) {
      console.error('deleteMessage DB error:', error)
      set({ messages: prev })
    }
  },

  deleteAllMessages: async (studentId: string) => {
    const prev = get().messages
    set((state) => ({ messages: state.messages.filter(m => m.studentId !== studentId) }))
    const { error } = await supabase.from('SentMessage').delete().eq('studentId', studentId)
    if (error) {
      console.error('deleteAllMessages DB error:', error)
      set({ messages: prev })
    }
  }
 }),
 {
    name: 'odev-takip-storage',
    storage: createJSONStorage(() => AsyncStorage),
  }
 )
)
