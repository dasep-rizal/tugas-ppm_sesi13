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

export default function PengajuanIzin() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    jenisIzin: "",
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
    if (!formData.jenisIzin || !formData.tanggalMulai || !formData.alasan) {
      Alert.alert("Perhatian", "Tolong lengkapi kolom jenis izin, tanggal, dan alasan.");
      return;
    }

    if (!user) {
      Alert.alert("Error", "Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "pengajuan_izin"), {
        uid: user.uid,
        nama: user.displayName || "Karyawan",
        email: user.email,
        ...formData,
        status: "Pending",
        tanggalPengajuan: serverTimestamp(),
      });

      await addDoc(collection(db, "attendance"), {
        userId: user.uid,
        email: user.email,
        status: "Izin",
        date: formData.tanggalMulai,
        endDate: formData.tanggalSelesai || formData.tanggalMulai,
        note: formData.alasan,
        category: formData.jenisIzin,
        source: "pengajuan",
        checkIn: "-",
        checkOut: "-",
        location: "Pengajuan Izin",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Berhasil", "Pengajuan anda telah terkirim.");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Gagal mengirim pengajuan.");
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
        {/* Header Bersih */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pengajuan Izin</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Banner Informasi */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Silakan isi formulir di bawah ini dengan benar. Status pengajuan dapat dipantau melalui menu riwayat.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Tipe Pengajuan</Text>
            <TextInput
              style={styles.input}
              value={formData.jenisIzin}
              onChangeText={(text) => setFormData({ ...formData, jenisIzin: text })}
              placeholder="Sakit / Izin / Cuti"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Dari Tanggal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.tanggalMulai}
                  onChangeText={(text) => setFormData({ ...formData, tanggalMulai: formatDateInput(text) })}
                  placeholder="06/02/2026"
                />
              </View>
              <View style={{ width: 15 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Sampai Tanggal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.tanggalSelesai}
                  onChangeText={(text) => setFormData({ ...formData, tanggalSelesai: formatDateInput(text) })}
                  placeholder="06/02/2026"
                />
              </View>
            </View>

            <Text style={styles.label}>Alasan Pengajuan</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.alasan}
              onChangeText={(text) => setFormData({ ...formData, alasan: text })}
              multiline
              numberOfLines={4}
              placeholder="Tuliskan alasan lengkap anda di sini"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>Kirim Sekarang</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Pastikan data sudah benar sebelum mengirim pengajuan.
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
  infoBanner: { backgroundColor: "#F1F5F9", padding: 15, borderRadius: 12, marginBottom: 25 },
  infoText: { fontSize: 12, color: "#64748B", lineHeight: 18 },
  formContainer: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
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
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 35,
  },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  footerNote: { fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 20 }
});