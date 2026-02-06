import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [biodata, setBiodata] = useState({ namaLengkap: "Karyawan", jabatan: "-" });
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    hadir: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
    alpa: 0,
  });

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const normalizeStatus = (status?: string) => {
    const value = (status ?? "").toLowerCase();
    if (value.includes("terlambat")) return "Terlambat";
    if (value.includes("izin")) return "Izin";
    if (value.includes("sakit")) return "Sakit";
    if (value.includes("cuti")) return "Cuti";
    if (value.includes("alpa")) return "Alpa";
    if (value.includes("tepat waktu") || value.includes("hadir")) return "Hadir";
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
    const stats = { total: 0, hadir: 0, izin: 0, sakit: 0, cuti: 0, alpa: 0 };
    records.forEach((record) => {
      stats.total += 1;
      const normalized = normalizeStatus(record.status);
      if (normalized === "Izin") stats.izin += 1;
      else if (normalized === "Sakit") stats.sakit += 1;
      else if (normalized === "Cuti") stats.cuti += 1;
      else if (normalized === "Alpa") stats.alpa += 1;
      else stats.hadir += 1;
    });
    return stats;
  };

  /* ================= LOAD DATA USER & ABSENSI ================= */
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        setBiodata({
          namaLengkap: userSnap.data().namaLengkap || "User",
          jabatan: userSnap.data().jabatan || "Karyawan",
        });
      }

      const q = query(
        collection(db, "attendance"),
        where("userId", "==", user.uid),
        where("date", "==", today)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0];
        setDocId(data.id);
        setCheckInTime(data.data().checkIn);
        setCheckOutTime(data.data().checkOut || null);
      }
      const monthSnap = await getDocs(
        query(collection(db, "attendance"), where("userId", "==", user.uid))
      );
      const monthRecords = monthSnap.docs
        .map((docSnap) => docSnap.data() as { date?: string; status?: string })
        .filter((record) => isSameMonth(record.date));
      setMonthlyStats(buildStats(monthRecords));
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [user, today, currentYearMonth]);

  useEffect(() => {
    if (!loading && !user) router.replace("/Auth-screen/Login");
    if (user) loadData();
  }, [user, loading, loadData]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "attendance"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const records = snap.docs
        .map((docSnap) => docSnap.data() as { date?: string; status?: string; checkIn?: string | null; checkOut?: string | null })
        .filter((record) => isSameMonth(record.date));

      setMonthlyStats(buildStats(records));

      const todayRecord = records.find((record) => record.date === today && record.checkIn);
      setCheckInTime(todayRecord?.checkIn ?? null);
      setCheckOutTime(todayRecord?.checkOut ?? null);
    });

    return unsubscribe;
  }, [user, currentYearMonth, today]);

  /* ================= HANDLE ABSENSI ================= */
  const handleAbsensi = async () => {
    if (!user) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      if (!checkInTime) {
        const ref = await addDoc(collection(db, "attendance"), {
          userId: user.uid,
          email: user.email,
          checkIn: time,
          checkOut: null,
          date: today,
          createdAt: serverTimestamp(),
        });
        setCheckInTime(time);
        setDocId(ref.id);
        Alert.alert("Berhasil", "Absen masuk berhasil");
      } else if (!checkOutTime) {
        await updateDoc(doc(db, "attendance", docId!), { checkOut: time });
        setCheckOutTime(time);
        Alert.alert("Berhasil", "Absen pulang berhasil");
      } else {
        Alert.alert("Info", "Anda sudah menyelesaikan absensi hari ini");
      }
    } catch (e) {
      Alert.alert("Error", "Terjadi kesalahan sistem");
    }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 1. HEADER - Sesuai Gambar */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.companyTitle}>PT War Indonesia</Text>
            <Text style={styles.appSubtitle}>Aplikasi Absensi Karyawan</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* 2. VISI MISI CARD - Sesuai Gambar */}
        <View style={styles.visionCardContainer}>
          <View style={styles.visionCardGradient}>
            <Text style={styles.visionTitle}>Visi & Misi</Text>
            <View style={styles.visionContent}>
              <Text style={styles.visionText}>
                <Text style={styles.visionStrong}>VISI:</Text> Menjadi perusahaan terdepan dalam inovasi digital.
              </Text>
              <Text style={styles.visionText}>
                <Text style={styles.visionStrong}>MISI:</Text> Memberikan solusi terbaik dan dampak positif bagi semua.
              </Text>
            </View>
            <View style={styles.circleDecor} />
          </View>
        </View>

        {/* 3. STATS KEHADIRAN */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kehadiran Anda Bulan Ini</Text>
        </View>
        <View style={styles.statsRow}>
          <StatBox label="Total" value={`${monthlyStats.total}`} color="#E0E7FF" textColor="#4338CA" />
          <StatBox label="Hadir" value={`${monthlyStats.hadir}`} color="#E0F2FE" textColor="#0EA5E9" />
          <StatBox label="Izin" value={`${monthlyStats.izin}`} color="#FEF3C7" textColor="#F59E0B" />
          <StatBox label="Sakit" value={`${monthlyStats.sakit}`} color="#FCE7F3" textColor="#DB2777" />
          <StatBox label="Cuti" value={`${monthlyStats.cuti}`} color="#DCFCE7" textColor="#22C55E" />
          <StatBox label="Alpa" value={`${monthlyStats.alpa}`} color="#F1F5F9" textColor="#475569" />
        </View>

        {/* 4. LAYANAN UTAMA */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Layanan Utama</Text>
        </View>
        <View style={styles.menuGrid}>
          <MenuBtn 
            icon="fingerprint" 
            label="Absensi" 
            color="#4338CA" 
            onPress={() => router.push("/(tabs)/absensi" as any)} 
          />
          <MenuBtn 
            icon="calendar-month" 
            label="Jadwal Kerja" 
            color="#0EA5E9" 
            onPress={() => router.push("/(tabs)/jadwal-kerja" as any)} 
          />
          <MenuBtn 
            icon="history" 
            label="Riwayat" 
            color="#8B5CF6" 
            onPress={() => router.push("/(tabs)/riwayat" as any)} 
          />
        </View>

        {/* 5. FOOTER BANTUAN */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn}>
            <Text style={styles.footerBtnText}>Pusat Bantuan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn}>
            <Text style={styles.footerBtnText}>Hubungi Kami</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= SUB-COMPONENTS ================= */

const StatBox = ({ label, value, color, textColor }: any) => (
  <View style={[styles.statBox, { backgroundColor: color }]}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
  </View>
);

const MenuBtn = ({ icon, label, color, onPress, subtitle }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
    </View>
    <View style={styles.menuTextContainer}>
      <Text style={styles.menuLabel}>{label}</Text>
      {subtitle && <Text style={styles.menuSubText}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
  </TouchableOpacity>
);

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 100, paddingTop: 10 },
  
  // Header Style (Mirip Gambar)
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  headerTextWrapper: { flex: 1 },
  companyTitle: { fontSize: 26, fontWeight: "800", color: "#1E293B", letterSpacing: -0.5 },
  appSubtitle: { fontSize: 14, color: "#64748B", marginTop: 2 },
  notifBtn: { padding: 10, backgroundColor: "#fff", borderRadius: 14, elevation: 3 },

  // Vision Card (Mirip Gambar)
  visionCardContainer: {
    marginHorizontal: 25,
    marginBottom: 30,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    elevation: 4,
    overflow: "hidden",
  },
  visionCardGradient: {
    padding: 25,
    backgroundColor: "#063a5d", // Biru muda halus sesuai gambar
    minHeight: 140,
    position: 'relative',
  },
  circleDecor: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#DBEAFE",
    opacity: 0.5,
    zIndex: -1,
  },
  visionTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginBottom: 10 },
  visionContent: { gap: 4 },
  visionText: { fontSize: 13, color: "rgba(255, 255, 255, 0.9)", lineHeight: 18 },
  visionStrong: { fontWeight: "800", color: "#FFFFFF" },

  // Stats Style
  sectionHeader: { paddingHorizontal: 25, marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 25, marginBottom: 25 },
  statBox: { width: '31%', padding: 15, borderRadius: 16, alignItems: 'center', elevation: 1 },
  statLabel: { fontSize: 11, color: "#64748B", marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: "800" },

  // Menu List Style
  menuGrid: { paddingHorizontal: 25, gap: 12 },
  menuItem: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    padding: 14, borderRadius: 20, elevation: 2 
  },
  iconContainer: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  menuTextContainer: { flex: 1, marginLeft: 15 },
  menuLabel: { fontSize: 15, fontWeight: "700", color: "#334155" },
  menuSubText: { fontSize: 12, color: "#94A3B8", marginTop: 2 },

  // Footer Style
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 20 },
  footerBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, elevation: 1 },
  footerBtnText: { fontSize: 13, fontWeight: "600", color: "#64748B" }
});