import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Homework, HomeworkStatus, Student } from '../types';
import { useTheme } from '../constants/Colors';

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
  const theme = useTheme();
  const hasSpecificStudents = hw.targetStudentIds && hw.targetStudentIds.length > 0;
  const relevant = students.filter(s => 
    hasSpecificStudents ? (hw.targetStudentIds || []).includes(s.id) : hw.targetClasses.includes(s.className)
  );
  const doneCount = relevant.filter(s => hw.submissions[s.id] === HomeworkStatus.DONE).length;
  const pct = relevant.length > 0 ? Math.round((doneCount / relevant.length) * 100) : 0;

  return (
    <Animated.View 
      entering={FadeInDown.duration(400).delay(100)}
      style={[styles.hwCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.hwHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hwTitle, { color: theme.text }]}>{hw.title}</Text>
          <View style={styles.tagRow}>
            {hw.targetClasses.map((cls) => (
              <View key={cls} style={[styles.classTag, { backgroundColor: theme.primaryLight, borderColor: theme.borderStrong }]}>
                <Text style={[styles.classTagText, { color: theme.primary }]}>{cls}</Text>
              </View>
            ))}
            {hasSpecificStudents && (
              <View style={[styles.classTag, { backgroundColor: theme.warning + '20', borderColor: theme.warning + '40' }]}>
                <Text style={[styles.classTagText, { color: theme.warning }]}>
                  Tekil Seçim ({hw.targetStudentIds?.length})
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      {hw.description ? (
        <Text style={[styles.hwDesc, { color: theme.textMuted }]} numberOfLines={2}>
          {hw.description}
        </Text>
      ) : null}
      
      <View style={[styles.hwFooter, { borderTopColor: theme.border }]}>
        <View style={styles.footerDate}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={theme.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.dueDateText, { color: theme.textLight }]}>
            Teslim: {new Date(hw.dueDate).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        
        <View style={styles.footerRight}>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: theme.success + '20' }]}
            onPress={() => onNotify(hw)}
          >
            <Ionicons name="logo-whatsapp" size={15} color={theme.success} />
            <Text style={[styles.footerBtnText, { color: theme.success }]}>Bildir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: theme.primaryLight }]}
            onPress={() => onAnalysis(hw)}
          >
            <Ionicons name="bar-chart-outline" size={15} color={theme.primary} />
            <Text style={[styles.footerBtnText, { color: theme.primary }]}>Analiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onEdit(hw)}
            style={[styles.footerIconBtn, { backgroundColor: theme.warning + '20' }]}
          >
            <Ionicons name="pencil" size={16} color={theme.warning} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => onDelete(hw)}
            style={[styles.footerIconBtn, { backgroundColor: theme.danger + '20' }]}
          >
            <Ionicons name="trash" size={16} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  hwCard: { 
    borderRadius: 20, 
    padding: 18, 
    marginHorizontal: 16, 
    marginTop: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 3, 
    borderWidth: 1, 
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
    marginBottom: 6 
  },
  tagRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 6 
  },
  classTag: { 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6, 
    borderWidth: 1, 
  },
  classTagText: { 
    fontSize: 10, 
    fontWeight: '800', 
  },
  hwDesc: { 
    fontSize: 14, 
    lineHeight: 20, 
    marginBottom: 12 
  },
  hwFooter: { 
    borderTopWidth: 1, 
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
    fontWeight: '600' 
  },
});
