import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

function TabIcon({
  focused,
  name,
  label,
}: {
  focused: boolean
  name: keyof typeof Ionicons.glyphMap
  label: string
}) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Ionicons 
        name={focused ? name : (name + '-outline' as any)} 
        size={22} 
        color={focused ? '#7C3AED' : '#94a3b8'} 
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    height: 90,
    paddingBottom: 24,
    paddingTop: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 64,
  },
  tabItemActive: {
    backgroundColor: '#F5F3FF',
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
})
