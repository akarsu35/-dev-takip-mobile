import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../constants/Colors'

function TabIcon({
  focused,
  name,
  label,
}: {
  focused: boolean
  name: keyof typeof Ionicons.glyphMap
  label: string
}) {
  const theme = useTheme();
  
  return (
    <View style={[
      styles.tabItem, 
      focused && { backgroundColor: theme.primaryLight }
    ]}>
      <Ionicons 
        name={focused ? name : (name + '-outline' as any)} 
        size={22} 
        color={focused ? theme.primary : theme.textLight} 
      />
      <Text style={[
        styles.tabLabel, 
        { color: theme.textLight },
        focused && { color: theme.primary, fontWeight: '800' }
      ]}>
        {label}
      </Text>
    </View>
  )
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { 
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        }],
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="clipboard" label="Kontrol" />
          ),
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="book" label="Ödevler" />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="people" label="Sınıflar" />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="calendar" label="Takvim" />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="chatbubble-ellipses" label="Mesajlar" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="grid" label="Menü" />
          ),
        }}
      />
      
      {/* Hidden Tabs (Accessible via More screen) */}
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: 90,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
    minWidth: 55,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 4,
  },
})
