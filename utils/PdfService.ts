import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Homework, Student, HomeworkStatus } from '../types';

const HTML_STATUS_COLORS: Record<HomeworkStatus, string> = {
  [HomeworkStatus.DONE]: '#10b981',
  [HomeworkStatus.MISSING]: '#ef4444',
  [HomeworkStatus.INCOMPLETE]: '#f59e0b',
  [HomeworkStatus.ABSENT]: '#8b5cf6',
  [HomeworkStatus.NOT_BROUGHT]: '#3b82f6',
  [HomeworkStatus.PENDING]: '#94a3b8',
};

const HTML_STATUS_LABELS: Record<HomeworkStatus, string> = {
  [HomeworkStatus.DONE]: 'Tamam',
  [HomeworkStatus.MISSING]: 'Yapmadı',
  [HomeworkStatus.INCOMPLETE]: 'Eksik',
  [HomeworkStatus.ABSENT]: 'Gelmedi',
  [HomeworkStatus.NOT_BROUGHT]: 'Getirmedi',
  [HomeworkStatus.PENDING]: 'Bekliyor',
};

export const generateHomeworkReport = async (
  homeworks: Homework[], 
  students: Student[], 
  selectedStudentIds?: string[],
  fileName?: string
) => {
  const filteredStudents = selectedStudentIds 
    ? students.filter(s => selectedStudentIds.includes(s.id))
    : students;

  const sortedStudents = [...filteredStudents].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  
  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #7C3AED; padding-bottom: 10px; margin-bottom: 20px; }
          h1 { color: #7C3AED; margin: 0; font-size: 22px; }
          .report-date { color: #64748b; font-size: 11px; margin-top: 5px; }
          
          .summary-card { background-color: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 25px; }
          .summary-title { font-weight: bold; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; display: block; }
          .summary-flex { display: flex; justify-content: space-between; }
          .summary-item { font-size: 13px; color: #1e293b; }
          
          .student-section { margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
          .student-header { background-color: #f1f5f9; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; border-left: 4px solid #7C3AED; }
          .student-name { font-size: 16px; font-weight: bold; color: #1e293b; margin: 0; }
          .student-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
          
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
          th { background-color: #fcfdfe; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          tr:last-child td { border-bottom: none; }
          
          .status-badge { padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; color: white; display: inline-block; }
          .empty-msg { text-align: center; padding: 40px; color: #94a3b8; font-style: italic; }
          
          @media print {
            .student-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ÖĞRENCİ BAZLI ÖDEV RAPORU</h1>
          <div class="report-date">Tarih: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>

        <div class="summary-card">
          <span class="summary-title">Genel Durum</span>
          <div class="summary-flex">
            <div class="summary-item"><strong>Toplam Öğrenci:</strong> ${sortedStudents.length}</div>
            <div class="summary-item"><strong>Toplam Ödev:</strong> ${homeworks.length}</div>
          </div>
        </div>

        ${sortedStudents.length === 0 ? '<div class="empty-msg">Seçilen kriterlere uygun öğrenci bulunamadı.</div>' : ''}

        ${sortedStudents.map(student => {
          const studentHomeworks = homeworks.filter(hw => 
            hw.targetStudentIds?.includes(student.id) || hw.targetClasses.includes(student.className)
          ).sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
          
          const done = studentHomeworks.filter(hw => hw.submissions[student.id] === HomeworkStatus.DONE).length;
          const total = studentHomeworks.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          
          return `
            <div class="student-section">
              <div class="student-header">
                <div class="student-name">${student.name.toUpperCase()}</div>
                <div class="student-meta">
                  Sınıf: ${student.className} | 
                  Başarı Oranı: %${pct} (${done}/${total} Ödev Tamamlandı)
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 50%">ÖDEV BAŞLIĞI</th>
                    <th style="width: 25%">TESLİM TARİHİ</th>
                    <th style="width: 25%">DURUM</th>
                  </tr>
                </thead>
                <tbody>
                  ${studentHomeworks.length === 0 ? '<tr><td colspan="3" style="text-align: center; padding: 15px; color: #94a3b8;">Bu öğrenciye henüz ödev atanmamış.</td></tr>' : ''}
                  ${studentHomeworks.map(hw => {
                    const status = hw.submissions[student.id] || HomeworkStatus.PENDING;
                    const color = HTML_STATUS_COLORS[status];
                    const label = HTML_STATUS_LABELS[status];
                    return `
                      <tr>
                        <td><strong>${hw.title}</strong></td>
                        <td>${new Date(hw.dueDate).toLocaleDateString('tr-TR')}</td>
                        <td>
                          <span class="status-badge" style="background-color: ${color}">
                            ${label.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    let finalUri = uri;

    if (fileName) {
      // Normalize and sanitize filename
      const safeName = fileName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const newPath = `${cacheDir}${safeName}.pdf`;
      await FileSystem.moveAsync({
        from: uri,
        to: newPath
      });
      finalUri = newPath;
    }

    await Sharing.shareAsync(finalUri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};




