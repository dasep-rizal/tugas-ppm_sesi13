import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack initialRouteName="Auth-screen/Login">
        <Stack.Screen name="Auth-screen/Login" options={{ headerShown: false }} />
        <Stack.Screen name="Auth-screen/Register" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
