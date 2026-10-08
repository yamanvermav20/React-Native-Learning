import { Stack } from 'expo-router'
import { Pressable, Text } from 'react-native'
import { useAuth } from '@/context/AuthContext'

export const unstable_settings = {
  anchor: 'notes',
}

export default function AppLayout() {
  const { signOut } = useAuth()

  return (
    <Stack>
<Stack.Screen
  name="notes"
  options={{
    title: 'Notes',
    headerRight: () => (
      <Pressable
        onPress={signOut}
        className="mr-3 rounded-md px-3 py-2"
      >
        <Text className="font-semibold text-red-500">
          Log out
        </Text>
      </Pressable>
    ),
  }}
/>
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
    </Stack>
  )
}
