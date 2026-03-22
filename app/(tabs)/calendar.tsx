import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from '../../store/useStore'
import { HomeworkStatus, Homework } from '../../types'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { HomeworkCard } from '../../components/HomeworkCard'
import { Alert } from 'react-native'
import { useTheme } from '../../constants/Colors'

// Turkish Localization
LocaleConfig.locales['tr'] = {
  monthNames: [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ],
  monthNamesShort: [
    'Oca',
    'Şub',
    'Mar',
    'Nis',
    'May',
    'Haz',
    'Tem',
    'Ağu',
    'Eyl',
    'Eki',
    'Kas',
    'Ara',
  ],
  dayNames: [
    'Pazar',
    'Pazartesi',
    'Salı',
    'Çarşamba',
    'Perşembe',
    'Cuma',
    'Cumartesi',
  ],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  today: 'Bugün',
}
LocaleConfig.defaultLocale = 'tr'

export default function CalendarScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { 
    homeworks, 
    students, 
    setSelectedHwId,
    deleteHomework,
    updateHomework
  } = useStore()
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0],
  )

  const markedDates = useMemo(() => {
    const marks: any = {}
    homeworks.forEach((hw) => {
      const date = new Date(hw.dueDate).toISOString().split('T')[0]
      if (!marks[date]) {
        marks[date] = { 
          customStyles: {
            container: {
              backgroundColor: theme.primaryLight,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: theme.primary,
              justifyContent: 'center',
              alignItems: 'center'
            },
            text: {
              color: theme.primary,
              fontWeight: '800',
            }
          }
        }
      }
    })

    // Add selection highlight
    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: theme.primary,
        customStyles: {
           container: {
            backgroundColor: theme.primary,
            borderRadius: 10,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6
           },
           text: {
            color: '#fff',
            fontWeight: '900',
           }
        }
      }
    }
    return marks
  }, [homeworks, selectedDate, theme])

  const selectedDayHomeworks = useMemo(() => {
    return homeworks
      .filter((hw) => {
        const hwDate = new Date(hw.dueDate).toISOString().split('T')[0]
        return hwDate === selectedDate
      })
      .sort(
        (a, b) =>
          new Date(a.assignedDate).getTime() -
          new Date(b.assignedDate).getTime(),
      )
  }, [homeworks, selectedDate])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.screenTitle, { color: theme.primary }]}>📅 Ödev Takvimi</Text>
      </View>

      <View style={[styles.calendarContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Calendar
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          markingType={'custom'}
          theme={{
            backgroundColor: theme.surface,
            calendarBackground: theme.surface,
            textSectionTitleColor: theme.textLight,
            selectedDayBackgroundColor: theme.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: theme.primary,
            dayTextColor: theme.text,
            textDisabledColor: theme.textLight + '50',
            dotColor: theme.primary,
            selectedDotColor: '#ffffff',
            arrowColor: theme.primary,
            disabledArrowColor: theme.textLight,
            monthTextColor: theme.text,
            indicatorColor: theme.primary,
            textDayFontWeight: '600',
            textMonthFontWeight: '800',
            textDayHeaderFontWeight: '700',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12,
          }}
        />
      </View>

      <View style={[styles.listHeader, { backgroundColor: theme.background }]}>
        <Text style={[styles.listTitle, { color: theme.textMuted }]}>
          {new Date(selectedDate).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <Text style={[styles.listCount, { color: theme.primary }]}>{selectedDayHomeworks.length} Ödev</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {selectedDayHomeworks.map((hw) => (
          <HomeworkCard
            key={hw.id}
            hw={hw}
            students={students}
            onNotify={(h) => {
              setSelectedHwId(h.id)
              router.push('/(tabs)')
            }}
            onAnalysis={(h) => {
              setSelectedHwId(h.id)
              router.push('/(tabs)')
            }}
            onEdit={() => router.push('/(tabs)/homework')}
            onDelete={() => {
              Alert.alert('Sil', `"${hw.title}" ödevini silmek istediğinize emin misiniz?`, [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteHomework(hw.id) },
              ])
            }}
          />
        ))}
        {selectedDayHomeworks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.textLight} />
            <Text style={[styles.emptyText, { color: theme.textLight }]}>
              Bu tarihte teslim edilecek ödev bulunmuyor.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 20, fontWeight: '900' },
  calendarContainer: {
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  listTitle: { fontSize: 14, fontWeight: '800' },
  listCount: { fontSize: 12, fontWeight: '700' },
  list: { flex: 1 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
