
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'

import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Profile() {
  const { session } = useAuth()
  const user = session?.user

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Load the saved image whenever the logged-in user changes.
  useEffect(() => {
    let active = true

    async function loadProfile() {
      if (!user) {
        setAvatarUrl(null)
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_path')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error

        if (active) {
          const path = data?.avatar_path

          if (path) {
            const { data: publicData } = supabase.storage
              .from('profile-images')
              .getPublicUrl(path)

            setAvatarUrl(publicData.publicUrl)
          } else {
            setAvatarUrl(null)
          }
        }
      } catch (error) {
        if (active) {
          console.error('Profile loading failed:', error)
          Alert.alert('Error', 'Could not load your profile.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [user?.id])

  async function uploadAvatar() {
    if (!user) {
      Alert.alert('Not logged in', 'Please sign in first.')
      return
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Allow photo library access to choose a profile picture.',
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })

      if (result.canceled) return

      const asset = result.assets[0]

      if (!asset.base64) {
        Alert.alert('Error', 'Could not read the selected image.')
        return
      }

      const contentType = asset.mimeType ?? 'image/jpeg'
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ]

      if (!allowedTypes.includes(contentType)) {
        Alert.alert('Invalid image', 'Choose a JPEG, PNG, or WebP image.')
        return
      }

      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Image too large', 'Choose an image smaller than 5 MB.')
        return
      }

      setUploading(true)

      // Convert the selected image's Base64 data into binary bytes.
      const imageBytes = decode(asset.base64)

      // Each user gets their own Storage folder.
      const path = `${user.id}/avatar`

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(path, imageBytes, {
          contentType,
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Save the Storage path in PostgreSQL.
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_path: path,
          updated_at: new Date().toISOString(),
        })

      if (profileError) throw profileError

      // Public bucket: generate the URL used to display the photo.
      const { data: publicData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(path)

      // Refresh the displayed image even though the object path is unchanged.
      setAvatarUrl(
        `${publicData.publicUrl}?updated=${Date.now()}`,
      )

      Alert.alert('Success', 'Profile picture uploaded!')
    } catch (error) {
      console.error('Avatar upload failed:', error)
      Alert.alert(
        'Upload failed',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-gray-900 px-6">
      {loading ? (
        <ActivityIndicator size="large" color="#60A5FA" />
      ) : (
        <View className="items-center gap-4">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="h-32 w-32 rounded-full bg-gray-700"
              resizeMode="cover"
            />
          ) : (
            <View className="h-32 w-32 items-center justify-center rounded-full bg-gray-700">
              <Text className="text-4xl font-bold text-gray-100">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}

          <Pressable
            onPress={uploadAvatar}
            disabled={uploading}
            className="rounded-xl bg-blue-600 px-6 py-3"
          >
            <Text className="font-semibold text-white">
              {uploading
                ? 'Uploading...'
                : avatarUrl
                  ? 'Change Profile Picture'
                  : 'Upload Profile Picture'}
            </Text>
          </Pressable>

          {uploading && (
            <ActivityIndicator color="#60A5FA" />
          )}
        </View>
      )}

      <Text className="rounded-2xl bg-gray-700 px-6 py-4 text-base font-bold text-gray-100">
        Logged in as
      </Text>

      <Text className="text-lg font-semibold text-blue-400">
        {user?.email}
      </Text>
    </View>
  )
}
