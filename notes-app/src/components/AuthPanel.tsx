import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Button, StyleSheet, Text, TextInput, View } from 'react-native'

import { supabase } from '@/lib/supabase'

export default function AuthPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Seed from storage so a persisted session shows immediately after a cold start.
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    // Single source of truth: every sign up / log in / log out / token refresh
    // fires here, so the UI updates by itself without touching state in the handlers.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('auth event:', event, 'user:', session?.user.email ?? null)
      setSession(session)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  async function signUp() {
    setError(null)
    const result = await supabase.auth.signUp({ email, password })
    console.log('signUp result:', JSON.stringify(result, null, 2))
    if (result.error) setError(result.error.message)
  }

  async function logIn() {
    setError(null)
    const result = await supabase.auth.signInWithPassword({ email, password })
    console.log('signInWithPassword result:', JSON.stringify(result, null, 2))
    if (result.error) setError(result.error.message)
  }

  async function logOut() {
    setError(null)
    const { error } = await supabase.auth.signOut()
    console.log('signOut error:', error)
    if (error) setError(error.message)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        {session ? `Logged in as ${session.user.email}` : 'Not logged in.'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.row}>
        <Button title="Sign up" onPress={signUp} disabled={!!session} />
        <Button title="Log in" onPress={logIn} disabled={!!session} />
        <Button title="Log out" onPress={logOut} disabled={!session} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  status: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  error: { color: 'red' },
})
