import * as ImagePicker from 'expo-image-picker'
import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { FlatList, Text, TextInput, View, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { supabase } from '@/lib/supabase'

type Note = {
  id: number
  title: string
}

// Card elevation is applied inline instead of via NativeWind's `shadow-*` classes.
// Those compile to CSS variables, and a View that gains variables after its first
// render trips a dev-only NativeWind "upgrade" warning that crashes while
// stringifying props. An inline boxShadow avoids that path entirely.
const cardShadow = { boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' } as const

// TEMP: RLS verification test. Fill these in before running.
const RLS_OTHER_USER_ID = '2fed8196-b73f-406c-bae6-e054e1d47a4d'
const RLS_TARGET_NOTE_ID = 18

async function runRlsTest(otherUserId: string, targetNoteId: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  console.log('[rls] running as:', user?.id)

  console.log(
    '[rls] insert as other:',
    await supabase
      .from('notes')
      .insert({ title: 'hijack', user_id: otherUserId })
      .select()
  )

  console.log(
    '[rls] update target:',
    await supabase
      .from('notes')
      .update({ title: 'rls-test' })
      .eq('id', targetNoteId)
      .select()
  )
}
async function testSignedUrl() {
  const { data, error } = await supabase.storage
    .from('note-images')
    .createSignedUrl('87152b06-b7cb-4521-8fc0-d771340af481/1791893742220.jpg', 60);
  console.log('[signed]', data?.signedUrl, error);
}

// TEMP: storage upload test (public bucket, no policies).
async function runUploadTest() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.log('[upload] no user')
    return
  }
  
  testSignedUrl();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
  })
  if (result.canceled) return

  const base64 = result.assets[0].base64
  if (!base64) {
    console.log('[upload] picker returned no base64 data')
    return
  }

  // Decode base64 -> bytes. RN's fetch(file://).arrayBuffer() silently
  // yields an empty body on Android, which uploads 0-byte files.
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const path = `${user.id}/${Date.now()}.jpg`

  const res = await supabase.storage
    .from('note-images')
    .upload(path, bytes.buffer, { contentType: 'image/jpeg' })
  console.log('[upload]', path, 'bytes:', bytes.length, res)
}

export default function Notes() {
  const insets = useSafeAreaInsets()
  const [notes, setNotes] = useState<Note[]>([])
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    fetchNotes()
  }, [])

  async function fetchNotes() {
    const { data, error } = await supabase
      .from('notes')
      .select('id, title')
      .order('id', { ascending: true })
    console.log('Data', data?.length)
    console.log('Error', error)

    if (error) {
      setError(error.message)
      return
    }

    setNotes(data ?? [])
  }

  async function addNote() {
    const title = text.trim()
    if (!title) return

    const { data, error } = await supabase
      .from('notes')
      .insert({ title })
      .select('id, title')
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setNotes((prev) => [...prev, data])
    setText('')
  }

  function startEdit(note: Note) {
    setEditingId(note.id)
    setText(note.title)
  }

  async function saveEdit() {
    if (editingId === null) return

    const title = text.trim()
    if (!title) return

    const { data, error } = await supabase
      .from('notes')
      .update({ title })
      .eq('id', editingId)
      .select('id, title')
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setNotes((prev) =>
      prev.map((n) => (n.id === data.id ? data : n))
    )

    setEditingId(null)
    setText('')
  }

  async function deleteNote(id: number) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setNotes((prev) => prev.filter((n) => n.id !== id))

    if (editingId === id) {
      setEditingId(null)
      setText('')
    }
  }

  const isEditing = editingId !== null
  const canSubmit = text.trim().length > 0

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <View
          className="w-full rounded-3xl border border-red-100 bg-white p-6"
          style={cardShadow}
        >
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <Text className="text-xl font-bold text-red-500">!</Text>
          </View>

          <Text className="mb-1 text-lg font-bold text-slate-900">
            Something went wrong
          </Text>
          <Text className="mb-5 text-sm leading-5 text-slate-500">
            {error}
          </Text>

          <Pressable
            onPress={() => {
              setError(null)
              fetchNotes()
            }}
            className="rounded-2xl bg-red-500 px-4 py-3.5 active:bg-red-600"
          >
            <Text className="text-center text-base font-semibold text-white">
              Try again
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pb-3 pt-5">
        <Text className="text-3xl font-bold tracking-tight text-slate-900">
          My Notes
        </Text>
        <Text className="mt-1 text-sm text-slate-500">
          {notes.length === 0
            ? 'Nothing saved yet'
            : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
        </Text>

        {/* TEMP: test triggers. Remove when done. */}
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => runRlsTest(RLS_OTHER_USER_ID, RLS_TARGET_NOTE_ID)}
            className="self-start rounded-xl bg-slate-200 px-3 py-2 active:bg-slate-300"
          >
            <Text className="text-xs font-semibold text-slate-700">
              Run RLS test
            </Text>
          </Pressable>

          <Pressable
            onPress={runUploadTest}
            className="self-start rounded-xl bg-slate-200 px-3 py-2 active:bg-slate-300"
          >
            <Text className="text-xs font-semibold text-slate-700">
              Run upload test
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Composer */}
      <View
        className="mx-5 mb-4 rounded-3xl border border-slate-200 bg-white p-3"
        style={cardShadow}
      >
        {isEditing ? (
          <View className="mb-2 flex-row items-center px-1">
            <View className="mr-2 h-2 w-2 rounded-full bg-amber-400" />
            <Text className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Editing note
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-center gap-2">
          <TextInput
            className="h-12 flex-1 rounded-2xl bg-slate-100 px-4 text-[16px] text-slate-900"
            style={{ paddingVertical: 0 }}
            textAlignVertical="center"
            placeholder={
              editingId === null ? "What's on your mind?" : 'Update the title'
            }
            placeholderTextColor="#94a3b8"
            value={text}
            onChangeText={setText}
            returnKeyType="done"
            onSubmitEditing={editingId === null ? addNote : saveEdit}
          />

          <Pressable
            onPress={editingId === null ? addNote : saveEdit}
            className={`h-12 justify-center rounded-2xl px-5 ${
              isEditing
                ? 'bg-amber-500 active:bg-amber-600'
                : 'bg-indigo-600 active:bg-indigo-700'
            } ${canSubmit ? '' : 'opacity-40'}`}
          >
            <Text className="text-base font-semibold text-white">
              {editingId === null ? 'Add' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="px-5 pb-4 flex-grow"
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 py-16">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
              <Text className="text-3xl">✎</Text>
            </View>
            <Text className="mb-1 text-lg font-semibold text-slate-900">
              No notes yet
            </Text>
            <Text className="text-center text-sm leading-5 text-slate-500">
              Jot something down above and it will show up here.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const active = item.id === editingId
          return (
            <View
              className={`flex-row items-center rounded-2xl border bg-white px-4 py-3.5 ${
                active ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
              }`}
              style={cardShadow}
            >
              <View
                className={`mr-3 h-8 w-8 items-center justify-center rounded-full ${
                  active ? 'bg-amber-100' : 'bg-indigo-50'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    active ? 'text-amber-700' : 'text-indigo-600'
                  }`}
                >
                  {index + 1}
                </Text>
              </View>

              <Text
                className="flex-1 pr-2 text-base font-medium leading-6 text-slate-900"
                numberOfLines={2}
              >
                {item.title}
              </Text>

              <View className="flex-row items-center gap-1.5">
                <Pressable
                  onPress={() => startEdit(item)}
                  hitSlop={6}
                  className="rounded-full bg-indigo-50 px-3 py-1.5 active:bg-indigo-100"
                >
                  <Text className="text-sm font-semibold text-indigo-600">
                    Edit
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => deleteNote(item.id)}
                  hitSlop={6}
                  className="rounded-full bg-red-50 px-3 py-1.5 active:bg-red-100"
                >
                  <Text className="text-sm font-semibold text-red-500">
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )
        }}
      />

      {/* Profile Button */}
      <View
        className="border-t border-slate-200 bg-white px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Link href="/profile" asChild>
          <Pressable className="flex-row items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 active:bg-slate-800">
            <Text className="text-base font-semibold text-white">
              Go to Profile
            </Text>
            <Text className="text-lg font-bold text-slate-400">›</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
