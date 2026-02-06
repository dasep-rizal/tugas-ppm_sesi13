import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";

export default function PengajuanCuti() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    jenisCuti: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    alasan: "",
  });

  const formatDateInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const handleSubmit = async () => {
    if (!formData.jenisCuti || !formData.tanggalMulai || !formData.alasan) {
      Alert.alert("Perhatian", "Mohon lengkapi seluruh data pengajuan cuti.");
      return;
    }

    if (!user) {
      Alert.alert("Error", "Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "pengajuan_cuti"), {
        uid: user.uid,
        nama: user.displayName || "Karyawan",
        ...formData,
        tipe: "CUTI",
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "attendance"), {
        userId: user.uid,
        email: user.email,
        status: "Cuti",
        date: formData.tanggalMulai,
        endDate: formData.tanggalSelesai || formData.tanggalMulai,
        note: formData.alasan,
        category: formData.jenisCuti,
        source: "pengajuan",
        checkIn: "-",
        checkOut: "-",
        location: "Pengajuan Cuti",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Berhasil", "Pengajuan cuti anda telah dikirim ke HRD.");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Gagal mengirim pengajuan cuti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Form Cuti</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Catatan: Pastikan sisa cuti tahunan Anda masih tersedia sebelum mengajukan permohonan.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Kategori Cuti</Text>
            <TextInput
              style={styles.input}
              value={formData.jenisCuti}
              onChangeText={(text) => setFormData({ ...formData, jenisCuti: text })}
              placeholder="Tahunan / Melahirkan / Menikah"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Dari Tanggal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.tanggalMulai}
                  onChangeText={(text) => setFormData({ ...formData, tanggalMulai: formatDateInput(text) })}
                  placeholder="DD/MM/YYYY"
                />
              </View>
              <View style={{ width: 15 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Hingga Tanggal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.tanggalSelesai}
                  onChangeText={(text) => setFormData({ ...formData, tanggalSelesai: formatDateInput(text) })}
                  placeholder="DD/MM/YYYY"
                />
              </View>
            </View>

            <Text style={styles.label}>Keperluan Cuti</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.alasan}
              onChangeText={(text) => setFormData({ ...formData, alasan: text })}
              multiline
              placeholder="Jelaskan secara detail alasan pengambilan cuti"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Ajukan Cuti Sekarang</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  backText: { fontSize: 14, color: "#4338CA", fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  scrollContent: { padding: 25 },
  infoBanner: { backgroundColor: "#F0F9FF", padding: 15, borderRadius: 12, marginBottom: 25 },
  infoText: { fontSize: 12, color: "#0369A1", lineHeight: 18 },
  formContainer: { gap: 4 },
  row: { flexDirection: 'row' },
  label: { fontSize: 12, fontWeight: "700", color: "#1E293B", marginTop: 14, marginBottom: 6, textTransform: "uppercase" },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: "#1E293B" },
  textArea: { height: 100, textAlignVertical: "top" },
  saveBtn: { backgroundColor: "#1E293B", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 35 },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});