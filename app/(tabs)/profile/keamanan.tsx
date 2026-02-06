import { useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../../config/firebase"; // Pastikan path ini benar

export default function KeamananPassword() {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleBack = () => {
    router.replace("/(tabs)/profile");
  };

  const handleUpdatePassword = async () => {
    // 1. Validasi Input
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Gagal", "Tolong isi semua kolom password");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Gagal", "Konfirmasi password baru tidak cocok");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Gagal", "Password baru minimal harus 6 karakter");
      return;
    }

    setLoading(true);

    try {
      // 2. Re-autentikasi (Wajib di Firebase sebelum ganti password)
      const credential = EmailAuthProvider.credential(user?.email!, currentPassword);
      await reauthenticateWithCredential(user!, credential);
      
      // 3. Update Password
      await updatePassword(user!, newPassword);
      
      Alert.alert("Berhasil", "Password anda telah diperbarui.");
      router.back();
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Password lama yang anda masukkan salah.");
      } else {
        Alert.alert("Error", "Gagal memperbarui password. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Keamanan & Password</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Informasi Login (Hanya Baca) */}
          <Text style={styles.sectionTitle}>Informasi Login</Text>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || "-"}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Status Akun</Text>
              <Text style={[styles.infoValue, { color: "#22C55E" }]}>Terverifikasi</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Form Ganti Password */}
          <Text style={styles.sectionTitle}>Ganti Password</Text>
          <View style={styles.formContainer}>
            <Text style={styles.label}>Password Lama</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Masukkan password saat ini"
              secureTextEntry
            />

            <Text style={styles.label}>Password Baru</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Masukkan password baru"
              secureTextEntry
            />

            <Text style={styles.label}>Konfirmasi Password Baru</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Ulangi password baru"
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>Simpan Password Baru</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Demi keamanan, jangan berikan password anda kepada siapapun termasuk pihak PT War Indonesia.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  keyboardContainer: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backText: { fontSize: 14, color: "#4338CA", fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  scrollContent: { padding: 25 },
  
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  
  infoBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  infoLabel: { fontSize: 14, color: "#64748B" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  
  divider: { height: 32 },
  
  formContainer: { gap: 4 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 14,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
  },
  saveBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  footerNote: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
  }
});