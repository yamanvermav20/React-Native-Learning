import { useEffect, useRef, useState } from 'react'
import { Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native'

import AuthPanel from '@/components/AuthPanel'
import { supabase } from '@/lib/supabase'

type Note = {
  id: number
  title: string
}

export default function Index() {
  const [notes, setNotes] = useState<Note[]>([])
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  // null = adding a new note; a number = editing that note's id
  const [editingId, setEditingId] = useState<number | null>(null)

  // undefined = auth not checked yet; null = logged out; string = logged-in user's id
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const lastUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    // INITIAL_SESSION fires on mount (with the restored session, if any), then
    // SIGNED_IN / SIGNED_OUT as the user logs in and out.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null
      if (lastUserId.current !== nextUserId) {
        // A different user (or none) is now logged in: drop any in-progress edit.
        setError(null)
        setEditingId(null)
        setText('')
      }
      lastUserId.current = nextUserId
      setUserId(nextUserId)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (userId === undefined) return // wait until we know who (if anyone) is logged in
    // Refetch whenever the logged-in user changes, so notes reflect the new session.
    fetchNotes()
  }, [userId])

  async function fetchNotes() {
    const { data, error } = await supabase
      .from('notes')
      .select('id, title')
      .order('id', { ascending: true })

    console.log('fetch data:', data)
    console.log('fetch error:', error)

    if (error) {
      setError(error.message)
      return
    }
    setNotes(data ?? [])
  }

  async function addNote() {
    const title = text.trim()
    if (!title) return

    // .select().single() returns the inserted row (with its server-generated id)
    const { data, error } = await supabase
      .from('notes')
      .insert({ title })
      .select('id, title')
      .single()

    console.log('insert data:', data)
    console.log('insert error:', error)

    if (error) {
      setError(error.message)
      return
    }
    // Local state update: append the row the server returned
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

    console.log('update data:', data)
    console.log('update error:', error)

    if (error) {
      setError(error.message)
      return
    }
    // Local state update: replace the one row that changed
    setNotes((prev) => prev.map((n) => (n.id === data.id ? data : n)))
    setEditingId(null)
    setText('')
  }

  async function deleteNote(id: number) {
    const { error } = await supabase.from('notes').delete().eq('id', id)

    console.log('delete error:', error)

    if (error) {
      setError(error.message)
      return
    }
    // Local state update: drop the deleted row
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setText('')
    }
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text>Error: {error}</Text>
        <Button title="Retry" onPress={() => { setError(null); fetchNotes() }} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AuthPanel />

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder={editingId === null ? 'New note title' : 'Edit title'}
          value={text}
          onChangeText={setText}
        />
        <Button
          title={editingId === null ? 'Add' : 'Save'}
          onPress={editingId === null ? addNote : saveEdit}
        />
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text>No notes yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.title}</Text>
            <Button title="Edit" onPress={() => startEdit(item)} />
            <Button title="Delete" color="red" onPress={() => deleteNote(item.id)} />
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { flex: 1 },
})
