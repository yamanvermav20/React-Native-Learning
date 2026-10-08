import { Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'

export default function Profile() {
  const { session } = useAuth();
  console.log(session?.access_token)

  return (
    <View className="flex-1 items-center justify-center gap-2 bg-gray-900">
      <Text className="text-base text-gray-100 font-bold bg-gray-500 rounded-2xl p-12">Logged in as</Text>
      <Text className="text-lg font-semibold text-blue-700">{session?.user.email}</Text>
    </View>
  )
}
