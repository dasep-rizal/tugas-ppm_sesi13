import { useRouter } from "expo-router";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function JadwalKerja() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jadwal, setJadwal] = useState<any[]>([]);

  // Mengambil nama bulan saat ini
  const currentMonth = new Date().toLocaleString("id-ID", { month: "long" });
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) loadJadwal();
  }, [user]);

  const loadJadwal = async () => {
    try {
      setLoading(true);
      // Mengambil jadwal milik user yang sedang login
      const q = query(
        collection(db, "schedules"),
        where("userId", "==", user!.uid),
        orderBy("tanggal", "asc")
      );

      const querySnapshot = await getDocs(q);
      const dataJadwal = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setJadwal(dataJadwal);
    } catch (error) {
      console.error("Error loading schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.cardJadwal}>
      <View style={styles.dateSection}>
        <Text style={styles.dateText}>{item.tanggal}</Text>
        <Text style={styles.dayText}>{item.hari}</Text>
      </View>
      <View style={styles.infoSection}>
        <Text style={styles.shiftTitle}>{item.shiftName || "Shift Normal"}</Text>
        <Text style={styles.timeText}>
          {item.jamMasuk} - {item.jamPulang}
        </Text>
      </View>
      <View style={styles.statusSection}>
        <View style={[styles.badge, { backgroundColor: item.isLibur ? "#FEE2E2" : "#DCFCE7" }]}>
          <Text style={[styles.badgeText, { color: item.isLibur ? "#B91C1C" : "#166534" }]}>
            {item.isLibur ? "Libur" : "Masuk"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jadwal Kerja</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        {/* Banner Informasi Bulan */}
        <View style={styles.monthBanner}>
          <Text style={styles.monthLabel}>Periode Kerja</Text>
          <Text style={styles.monthValue}>{currentMonth} {currentYear}</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4338CA" />
          </View>
        ) : jadwal.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Belum ada jadwal kerja untuk periode ini.</Text>
          </View>
        ) : (
          <FlatList
            data={jadwal}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
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
  content: { flex: 1, paddingHorizontal: 20 },
  monthBanner: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  monthLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  monthValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginTop: 4 },
  cardJadwal: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  dateSection: {
    width: 60,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9",
    paddingRight: 10,
  },
  dateText: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  dayText: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  infoSection: { flex: 1, paddingLeft: 15 },
  shiftTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  timeText: { fontSize: 13, color: "#64748B", marginTop: 2 },
  statusSection: { paddingLeft: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
  emptyText: { color: "#94A3B8", fontSize: 14, textAlign: "center" },
});