import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { FlatList, Text, TextInput, View, Pressable } from 'react-native'

import { supabase } from '@/lib/supabase'

type Note = {
  id: number
  title: string
}

export default function Notes() {
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
            console.log("Data", data?.length);
      console.log("Error", error);

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

  if (error) {
    return (
      <View className="flex-1 bg-white px-5 pt-5">
        <View className="rounded-xl bg-red-50 p-4">
          <Text className="mb-3 text-base font-medium text-red-600">
            Error: {error}
          </Text>

          <Pressable
            onPress={() => {
              setError(null)
              fetchNotes()
            }}
            className="rounded-lg bg-red-500 px-4 py-3"
          >
            <Text className="text-center font-semibold text-white">
              Retry
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-green-50 px-5 pt-5">
      <View className="mb-5 flex-row items-center gap-2">
        <TextInput
          className="flex-1 rounded-xl border border-black bg-green-100 px-4 py-3 text-base"
          placeholder={
            editingId === null ? 'New note title' : 'Edit title'
          }
          placeholderTextColor="#9ca3af"
          value={text}
          onChangeText={setText}
        />

        <Pressable
          onPress={editingId === null ? addNote : saveEdit}
          className={`rounded-xl px-4 py-3 ${
            editingId === null ? 'bg-blue-700' : 'bg-green-600'
          }`}
        >
          <Text className="font-semibold text-white">
            {editingId === null ? 'Add' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <Text className="mt-5 text-center text-gray-500">
            No notes yet.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="mb-2 flex-row items-center rounded-xl bg-red-950 p-3 shadow-sm">
            <Text className="flex-1 text-base text-gray-50">
              {item.title}
            </Text>

            <Pressable
              onPress={() => startEdit(item)}
              className="mr-2 rounded-lg bg-blue-500 px-3 py-2"
            >
              <Text className="font-medium text-white">
                Edit
              </Text>
            </Pressable>

            <Pressable
              onPress={() => deleteNote(item.id)}
              className="rounded-lg bg-red-500 px-3 py-2"
            >
              <Text className="font-medium text-white">
                Delete
              </Text>
            </Pressable>
          </View>
        )}
      />

      {/* Profile Button */}
      <Link href="/profile" asChild>
        <Pressable className="mb-6 mt-4 rounded-xl bg-blue-900 px-6 py-3">
          <Text className="text-center font-semibold text-white">
            Go to Profile
          </Text>
        </Pressable>
      </Link>

    </View>
  )
}