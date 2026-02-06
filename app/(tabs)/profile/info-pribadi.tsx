import { useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
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
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";

export default function InformasiPribadi() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [formData, setFormData] = useState({
    namaLengkap: "",
    jabatan: "",
    email: "",
    nomorTelepon: "",
    alamat: "",
    nik: "",
  });

  useEffect(() => {
    if (user) loadUserData();
  }, [user]);

  const handleBack = () => {
    router.replace("/(tabs)/profile");
  };

  const loadUserData = async () => {
    try {
      const userSnap = await getDoc(doc(db, "users", user!.uid));
      const data = userSnap.exists() ? userSnap.data() : {};
      const initialData = {
        namaLengkap: data.namaLengkap || "",
        jabatan: data.jabatan || "",
        email: data.email || user?.email || "",
        nomorTelepon: data.nomorTelepon || "",
        alamat: data.alamat || "",
        nik: data.nik || "",
      };

      setFormData(initialData);

      // LOGIKA POP-UP: Jika ada field yang kosong, munculkan peringatan
      const isIncomplete = Object.values(initialData).some((value) => value === "");
      if (isIncomplete) {
        Alert.alert("Perhatian", "Tolong lengkapi biodata anda");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!user) {
      Alert.alert("Error", "Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    // Validasi sebelum simpan
    const isIncomplete = Object.values(formData).some((value) => value === "");
    if (isIncomplete) {
      Alert.alert("Gagal", "Tolong lengkapi semua biodata anda sebelum menyimpan");
      return;
    }

    setUpdating(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
        ...formData,
        email: formData.email || user.email || "",
        updatedAt: new Date(),
        },
        { merge: true }
      );
      Alert.alert("Berhasil", "Data berhasil disimpan.");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan data.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4338CA" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Profil</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            Silakan lengkapi semua kolom di bawah ini untuk pembaruan data karyawan PT War Indonesia.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Nama Lengkap</Text>
          <TextInput
            style={styles.input}
            value={formData.namaLengkap}
            onChangeText={(text) => setFormData({ ...formData, namaLengkap: text })}
            placeholder="Masukkan nama lengkap"
          />

          <Text style={styles.label}>Nomor Induk Karyawan (NIK)</Text>
          <TextInput
            style={styles.input}
            value={formData.nik}
            onChangeText={(text) => setFormData({ ...formData, nik: text })}
            placeholder="Masukkan NIK"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Email Aktif</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Masukkan email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Jabatan</Text>
          <TextInput
            style={styles.input}
            value={formData.jabatan}
            onChangeText={(text) => setFormData({ ...formData, jabatan: text })}
            placeholder="Contoh: Staff IT / Manager"
          />

          <Text style={styles.label}>Nomor Telepon / WA</Text>
          <TextInput
            style={styles.input}
            value={formData.nomorTelepon}
            onChangeText={(text) => setFormData({ ...formData, nomorTelepon: text })}
            keyboardType="phone-pad"
            placeholder="Contoh: 08123456789"
          />

          <Text style={styles.label}>Alamat Domisili</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.alamat}
            onChangeText={(text) => setFormData({ ...formData, alamat: text })}
            multiline
            placeholder="Masukkan alamat lengkap sesuai domisili"
          />
        </View>

        <TouchableOpacity 
          style={styles.saveBtn} 
          onPress={handleUpdate}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
          )}
        </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  keyboardContainer: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  infoBanner: { backgroundColor: "#F1F5F9", padding: 15, borderRadius: 12, marginBottom: 25 },
  infoText: { fontSize: 12, color: "#64748B", lineHeight: 18 },
  formContainer: { gap: 4 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
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
    paddingVertical: 10,
    fontSize: 14,
    color: "#1E293B",
  },
  textArea: { height: 80, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});