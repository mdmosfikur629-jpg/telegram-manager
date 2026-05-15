import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Title } from 'react-native-paper';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Title style={styles.title}>TG Manager</Title>
        <Text style={styles.subtitle}>Multi-Account Telegram Manager</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Login
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          style={styles.link}
        >
          Don't have an account? Register
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, textAlign: 'center', color: '#2AABEE', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 32 },
  input: { marginBottom: 12 },
  button: { marginTop: 8, paddingVertical: 4 },
  link: { marginTop: 16 },
  error: { color: '#d32f2f', textAlign: 'center', marginBottom: 12 },
});
