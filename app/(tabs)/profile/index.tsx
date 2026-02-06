import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db, storage } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";

export default function Profile() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    hadir: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
    alpa: 0,
  });

  const [biodata, setBiodata] = useState({
    namaLengkap: "Nama Pengguna",
    jabatan: "",
    nik: "-",
    email: user?.email ?? "-",
  });

  const currentYearMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const normalizeStatus = (status?: string) => {
    const value = (status ?? "").toLowerCase();
    if (value.includes("izin")) return "Izin";
    if (value.includes("sakit")) return "Sakit";
    if (value.includes("cuti")) return "Cuti";
    if (value.includes("alpa")) return "Alpa";
    if (value.includes("terlambat") || value.includes("tepat waktu") || value.includes("hadir")) return "Hadir";
    return "Hadir";
  };

  const parseDateParts = (rawDate?: string) => {
    if (!rawDate) return null;
    if (rawDate.includes("-")) {
      const [first, second, third] = rawDate.split("-");
      const a = Number(first);
      const b = Number(second);
      const c = Number(third);
      if (!a || !b || !c) return null;
      if (first.length === 4 || a > 31) {
        return { year: a, month: b, day: c };
      }
      return { year: c, month: b, day: a };
    }
    if (rawDate.includes("/")) {
      const [day, month, year] = rawDate.split("/").map((value) => Number(value));
      if (!year || !month || !day) return null;
      return { year, month, day };
    }
    return null;
  };

  const isSameMonth = (rawDate?: string) => {
    const parts = parseDateParts(rawDate);
    if (!parts) return false;
    const [yearStr, monthStr] = currentYearMonth.split("-");
    return parts.year === Number(yearStr) && parts.month === Number(monthStr);
  };

  const buildStats = (records: { status?: string }[]) => {
    const stats = { hadir: 0, izin: 0, sakit: 0, cuti: 0, alpa: 0 };
    records.forEach((record) => {
      const normalized = normalizeStatus(record.status);
      if (normalized === "Izin") stats.izin += 1;
      else if (normalized === "Sakit") stats.sakit += 1;
      else if (normalized === "Cuti") stats.cuti += 1;
      else if (normalized === "Alpa") stats.alpa += 1;
      else stats.hadir += 1;
    });
    return stats;
  };

  /* ================= LOAD DATA ================= */
  const loadUserData = useCallback(async () => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setBiodata({
          namaLengkap: data.namaLengkap || "Nama Pengguna",
          jabatan: data.jabatan || "Karyawan",
          nik: data.nik || "-",
          email: user.email ?? "-",
        });
        setPhoto(data.photoURL || null);
      }

      const monthSnap = await getDocs(
        query(collection(db, "attendance"), where("userId", "==", user.uid))
      );
      const monthRecords = monthSnap.docs
        .map((docSnap) => docSnap.data() as { date?: string; status?: string })
        .filter((record) => isSameMonth(record.date));
      setMonthlyStats(buildStats(monthRecords));
    } catch (err) {
      Alert.alert("Error", "Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, currentYearMonth]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      return undefined;
    }, [loadUserData])
  );

  /* ================= PICK & UPLOAD IMAGE ================= */
  const uploadProfilePhoto = async (uri: string) => {
    if (!user) {
      Alert.alert("Error", "Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    setUploading(true);
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error("Gagal membaca file gambar.");
      }
      const blob = await response.blob();
      const fileRef = ref(storage, `profile_photos/${user.uid}.jpg`);

      await uploadBytes(fileRef, blob);
      const photoURL = await getDownloadURL(fileRef);

      setPhoto(photoURL);
      await setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true });

      Alert.alert("Berhasil", "Foto profil diperbarui");
    } catch (err: any) {
      console.error("Upload photo error:", err);
      Alert.alert("Error", err?.message ? String(err.message) : "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Izin ditolak", "Akses galeri diperlukan");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const pickFromFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const pickImage = () => {
    Alert.alert("Ganti Foto Profil", "Pilih sumber foto", [
      { text: "Galeri", onPress: () => void pickFromGallery() },
      { text: "File", onPress: () => void pickFromFile() },
      { text: "Batal", style: "cancel" },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Konfirmasi", "Yakin ingin logout?", [
      { text: "Batal", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
          await logout();
          router.replace("/Auth-screen/Login");
      }},
    ]);
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: photo ?? `https://ui-avatars.com/api/?name=${biodata.namaLengkap}&background=random` }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.cameraIcon} onPress={pickImage} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{biodata.namaLengkap}</Text>
          <Text style={styles.role}>{biodata.jabatan}</Text>
          <Text style={styles.nikText}>NIK: {biodata.nik}</Text>
        </View>

        {/* STATS CARD */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{monthlyStats.hadir}</Text>
            <Text style={styles.statLabel}>Hadir</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{monthlyStats.izin}</Text>
            <Text style={styles.statLabel}>Izin</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{monthlyStats.alpa}</Text>
            <Text style={styles.statLabel}>Alpa</Text>
          </View>
        </View>

        {/* MENU SECTION */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Pengaturan Akun</Text>
          
          <MenuButton 
            icon="person-outline" 
            text="Informasi Pribadi" 
            onPress={() => router.push("/(tabs)/profile/info-pribadi")} 
            bgColor="#E0F2FE" 
            iconColor="#0EA5E9"
          />
          <MenuButton 
            icon="shield-checkmark-outline" 
            text="Keamanan & Password" 
            onPress={() => router.push("/(tabs)/profile/keamanan")} 
            bgColor="#DCFCE7" 
            iconColor="#22C55E"
          />
          
          <MenuButton 
            icon="help-circle-outline" 
            text="Pusat Bantuan" 
            onPress={() => {}} 
            bgColor="#FFEDD5" 
            iconColor="#F97316"
          />
          <MenuButton 
            icon="log-out-outline" 
            text="Keluar" 
            onPress={handleLogout} 
            bgColor="#FEE2E2" 
            iconColor="#EF4444"
            isLogout
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= SUB-COMPONENTS ================= */

function MenuButton({ icon, text, onPress, bgColor, iconColor, isLogout }: any) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.menuText, isLogout && { color: "#EF4444" }]}>{text}</Text>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#1E293B",
    paddingVertical: 50,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "#fff",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 5,
    backgroundColor: "#0EA5E9",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: { fontSize: 22, fontWeight: "800", color: "#fff" },
  role: { fontSize: 14, color: "#94A3B8", marginTop: 4 },
  nikText: { fontSize: 13, color: "#E2E8F0", marginTop: 2 },
  
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    marginHorizontal: 25,
    marginTop: -35,
    borderRadius: 20,
    paddingVertical: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  statLabel: { fontSize: 12, color: "#64748B", marginTop: 4 },
  statDivider: { width: 1, height: "70%", backgroundColor: "#E2E8F0", alignSelf: "center" },

  menuContainer: { paddingHorizontal: 25, marginTop: 30 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 15 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#334155" },
});