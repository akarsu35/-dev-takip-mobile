export interface Student {
  id: string
  name: string
  parentName: string
  parentPhone: string
  className: string
  userId?: string
}

export enum HomeworkStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  MISSING = 'MISSING',
  INCOMPLETE = 'INCOMPLETE',
  ABSENT = 'ABSENT',
  NOT_BROUGHT = 'NOT_BROUGHT',
}

export interface Homework {
  id: string
  title: string
  description: string
  assignedDate: string
  dueDate: string
  targetClasses: string[]
  targetStudentIds?: string[]
  submissions: Record<string, HomeworkStatus>
  notifiedStudents?: Record<string, boolean>
  notifiedSubmissions?: Record<string, HomeworkStatus>
  userId?: string
}

export interface AppState {
  students: Student[]
  homeworks: Homework[]
}

export interface UserProfile {
  id?: string
  fullName: string | null
  schoolName: string | null
  subject: string | null
  isPremium?: boolean
}

export interface Message {
  id: string
  studentId: string
  content: string
  type: string
  createdAt: string
}
