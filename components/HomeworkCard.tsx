import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Homework, HomeworkStatus, Student } from '../types';

interface HomeworkCardProps {
  hw: Homework;
  students: Student[];
  onNotify: (hw: Homework) => void;
  onAnalysis: (hw: Homework) => void;
  onEdit: (hw: Homework) => void;
  onDelete: (hw: Homework) => void;
}

export const HomeworkCard = ({ 
  hw, 
  students, 
  onNotify, 
  onAnalysis, 
  onEdit, 
  onDelete 
}: HomeworkCardProps) => {
  const hasSpecificStudents = hw.targetStudentIds && hw.targetStudentIds.length > 0;
  const relevant = students.filter(s => 
    hasSpecificStudents ? (hw.targetStudentIds || []).includes(s.id) : hw.targetClasses.includes(s.className)
  );
  const doneCount = relevant.filter(s => hw.submissions[s.id] === HomeworkStatus.DONE).length;
  const pct = relevant.length > 0 ? Math.round((doneCount / relevant.length) * 100) : 0;

  return (
    <Animated.View 
      entering={FadeInDown.duration(400).delay(100)}
      style={styles.hwCard}
    >
      <View style={styles.hwHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hwTitle}>{hw.title}</Text>
          <View style={styles.tagRow}>
            {hw.targetClasses.map((cls) => (
              <View key={cls} style={styles.classTag}>
                <Text style={styles.classTagText}>{cls}</Text>
              </View>
            ))}
            {hasSpecificStudents && (
              <View style={[styles.classTag, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Text style={[styles.classTagText, { color: '#D97706' }]}>
                  Tekil Seçim ({hw.targetStudentIds?.length})
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      {hw.description ? (
        <Text style={styles.hwDesc} numberOfLines={2}>
          {hw.description}
        </Text>
      ) : null}
      
      <View style={styles.hwFooter}>
        <View style={styles.footerDate}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color="#94a3b8"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.dueDateText}>
            Teslim: {new Date(hw.dueDate).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        
        <View style={styles.footerRight}>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: '#dcfce7' }]}
            onPress={() => onNotify(hw)}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#16a34a" />
            <Text style={[styles.footerBtnText, { color: '#16a34a' }]}>Bildir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: '#F5F3FF' }]}
            onPress={() => onAnalysis(hw)}
          >
            <Ionicons name="bar-chart-outline" size={15} color="#7C3AED" />
            <Text style={[styles.footerBtnText, { color: '#7C3AED' }]}>Analiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onEdit(hw)}
            style={[styles.footerIconBtn, { backgroundColor: '#fff7ed' }]}
          >
            <Ionicons name="pencil" size={16} color="#f97316" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => onDelete(hw)}
            style={[styles.footerIconBtn, { backgroundColor: '#fef2f2' }]}
          >
            <Ionicons name="trash" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  hwCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 18, 
    marginHorizontal: 16, 
    marginTop: 16, 
    shadowColor: '#0f172a', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 3, 
    borderWidth: 1, 
    borderColor: '#f1f5f9' 
  },
  hwHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12 
  },
  hwTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#1e293b', 
    marginBottom: 6 
  },
  tagRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 6 
  },
  classTag: { 
    backgroundColor: '#F5F3FF', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: '#DDD6FE' 
  },
  classTagText: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#7C3AED' 
  },
  hwDesc: { 
    fontSize: 14, 
    color: '#64748b', 
    lineHeight: 20, 
    marginBottom: 12 
  },
  hwFooter: { 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9', 
    paddingTop: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  footerDate: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  footerRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  footerBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 10, 
    gap: 4, 
    height: 32 
  },
  footerBtnText: { 
    fontSize: 12, 
    fontWeight: '700' 
  },
  footerIconBtn: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  dueDateText: { 
    fontSize: 12, 
    color: '#94a3b8', 
    fontWeight: '600' 
  },
});
