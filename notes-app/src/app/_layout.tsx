import '../../global.css'

import { Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'

import { AuthProvider, useAuth } from '@/context/AuthContext'

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}

function RootNavigator() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
 
      <Stack.Protected guard={!session}> {/* When the user is not logged in (sessions is null and !session = true)*/}
        <Stack.Screen name="(auth)" />    
      </Stack.Protected>

      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  )
}
