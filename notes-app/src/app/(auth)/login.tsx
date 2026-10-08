import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(action: typeof signIn) {
    setBusy(true);
    setError(null);
    const message = await action(email.trim(), password);
    if (message) setError(message);
    setBusy(false);
  }

  return (
    <View className="flex-1 justify-center gap-3 bg-gray-300 px-6">
      <Text className="mb-2 text-2xl font-bold">Notes</Text>

      <TextInput
        className="rounded-md border border-gray-300 p-2.5 m-1 bg-blue-900 text-white"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextInput
        className="rounded-md border border-gray-300 p-2.5 m-1 bg-blue-900 text-white"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text className="text-red-600">{error}</Text> : null}

      <View className="rounded-3xl bg-black">
        <Button title="Log in" onPress={() => handle(signIn)} disabled={busy} />
      </View>
      <View className="rounded-2xl bg-black">
        <Button
          title="Sign up"
          onPress={() => handle(signUp)}
          disabled={busy}
        />
      </View>
    </View>
  );
}
