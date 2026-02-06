import { Ionicons } from "@expo/vector-icons"; // Pastikan sudah install expo-vector-icons
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";

type AttendanceRecord = {
  date?: string;
  endDate?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string; // Tepat Waktu, Terlambat
  location?: string;
  note?: string;
  category?: string;
  source?: string;
};

type AttendanceItem = AttendanceRecord & {
  id: string;
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

const toSortableDate = (rawDate?: string) => {
  const parts = parseDateParts(rawDate);
  if (!parts) return "";
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  return `${parts.year}-${mm}-${dd}`;
};

const formatDateDisplay = (rawDate?: string) => {
  const parts = parseDateParts(rawDate);
  if (!parts) return rawDate ?? "-";
  const dd = String(parts.day).padStart(2, "0");
  const mm = String(parts.month).padStart(2, "0");
  return `${dd}/${mm}/${parts.year}`;
};

export default function Riwayat() {
  const { user } = useAuth();
  const [data, setData] = useState<AttendanceItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Fetch Data dari Firebase
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "attendance"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const items: AttendanceItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as AttendanceRecord),
      }));
      setData(items.sort((a, b) => (toSortableDate(b.date) > toSortableDate(a.date) ? 1 : -1)));
    });
    return unsubscribe;
  }, [user]);

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

  const monthlyData = useMemo(() => {
    return data.filter((item) => {
      if (!item.date) return false;
      const parts = parseDateParts(item.date);
      if (!parts) return false;
      const { year, month } = parts;
      return year === currentYear && month === selectedMonth;
    });
  }, [data, selectedMonth, currentYear]);

  const filteredData = useMemo(() => {
    if (filterStatus === "Semua") return monthlyData;
    return monthlyData.filter((item) => normalizeStatus(item.status) === filterStatus);
  }, [monthlyData, filterStatus]);

  const stats = useMemo(() => {
    const result = { total: 0, hadir: 0, izin: 0, sakit: 0, cuti: 0, alpa: 0 };
    monthlyData.forEach((item) => {
      result.total += 1;
      const normalized = normalizeStatus(item.status);
      if (normalized === "Izin") result.izin += 1;
      else if (normalized === "Sakit") result.sakit += 1;
      else if (normalized === "Cuti") result.cuti += 1;
      else if (normalized === "Alpa") result.alpa += 1;
      else result.hadir += 1;
    });
    return result;
  }, [monthlyData]);

  const closeDropdowns = () => {
    if (monthPickerOpen) setMonthPickerOpen(false);
    if (filterOpen) setFilterOpen(false);
  };

  return (
    <View style={styles.container}>
      {(monthPickerOpen || filterOpen) && (
        <Pressable style={styles.dropdownBackdrop} onPress={closeDropdowns} />
      )}
      {/* 1. Header Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Riwayat Absensi</Text>
      </View>

      {/* 2. Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}><Text style={styles.statLabel}>Total</Text><Text style={styles.statValue}>{stats.total}</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Hadir</Text><Text style={styles.statValue}>{stats.hadir}</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Izin</Text><Text style={styles.statValue}>{stats.izin}</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Sakit</Text><Text style={styles.statValue}>{stats.sakit}</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Cuti</Text><Text style={styles.statValue}>{stats.cuti}</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Alpa</Text><Text style={styles.statValue}>{stats.alpa}</Text></View>
        </View>
      </View>

      {/* 3. Filter Controls */}
      <View style={styles.filterSection}>
        <View style={styles.monthDropdownWrap}>
          <TouchableOpacity
            style={styles.monthSelector}
            onPress={() => setMonthPickerOpen((prev) => !prev)}
          >
            <Text style={styles.monthText}>{months[selectedMonth - 1]} {currentYear}</Text>
            <Ionicons name="chevron-down" size={16} color="#334155" />
          </TouchableOpacity>

          {monthPickerOpen && (
            <View style={styles.monthDropdown}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {months.map((monthName, index) => (
                  <TouchableOpacity
                    key={monthName}
                    style={styles.monthOption}
                    onPress={() => {
                      setSelectedMonth(index + 1);
                      setMonthPickerOpen(false);
                    }}
                  >
                    <Text style={styles.monthOptionText}>{monthName} {currentYear}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        
        <View style={styles.filterDropdownWrap}>
          <TouchableOpacity
            style={styles.filterSelector}
            onPress={() => setFilterOpen((prev) => !prev)}
          >
            <View style={styles.filterLabelWrap}>
              <Ionicons name={
                filterStatus === "Semua" ? "apps" :
                filterStatus === "Hadir" ? "checkmark-circle" :
                filterStatus === "Terlambat" ? "time" :
                filterStatus === "Izin" ? "document-text" :
                filterStatus === "Sakit" ? "medkit" :
                "calendar"
              } size={14} color="#475569" />
              <Text style={styles.filterText}>{filterStatus}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#334155" />
          </TouchableOpacity>

          {filterOpen && (
            <View style={styles.filterDropdown}>
              {[
                { label: "Semua", icon: "apps" },
                { label: "Hadir", icon: "checkmark-circle" },
                { label: "Terlambat", icon: "time" },
                { label: "Izin", icon: "document-text" },
                { label: "Sakit", icon: "medkit" },
                { label: "Cuti", icon: "calendar" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.filterOption}
                  onPress={() => {
                    setFilterStatus(item.label);
                    setFilterOpen(false);
                  }}
                >
                  <Ionicons name={item.icon as any} size={14} color="#475569" />
                  <Text style={styles.filterOptionText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* 4. Attendance List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={closeDropdowns}
        renderItem={({ item }) => {
          const statusLabel = normalizeStatus(item.status);
          const isLeave = statusLabel === "Izin" || statusLabel === "Sakit" || statusLabel === "Cuti";
          const dateRange = item.endDate && item.endDate !== item.date
            ? `${formatDateDisplay(item.date)} - ${formatDateDisplay(item.endDate)}`
            : formatDateDisplay(item.date);
          const statusColor = statusLabel === "Hadir" ? "#22C55E"
            : statusLabel === "Terlambat" ? "#F59E0B"
            : statusLabel === "Izin" ? "#3B82F6"
            : statusLabel === "Sakit" ? "#EF4444"
            : statusLabel === "Cuti" ? "#10B981"
            : "#64748B";

          return (
            <View style={styles.attendanceCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{dateRange}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusBadgeText}>{statusLabel}</Text>
                </View>
              </View>

              {isLeave ? (
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>Jenis: <Text style={styles.timeValue}>{statusLabel}</Text></Text>
                  <Text style={styles.timeLabel}>Keterangan: <Text style={styles.timeValue}>{item.note ?? "-"}</Text></Text>
                </View>
              ) : (
                <>
                  <View style={styles.timeInfo}>
                    <Text style={styles.timeLabel}>Masuk: <Text style={styles.timeValue}>{item.checkIn ?? "-"}</Text></Text>
                    <Text style={styles.timeLabel}>Keluar: <Text style={styles.timeValue}>{item.checkOut ?? "-"}</Text></Text>
                  </View>

                  <View style={styles.locationInfo}>
                    <Ionicons name="location-sharp" size={16} color="#4F46E5" />
                    <Text style={styles.locationText}>Lokasi: {item.location ?? "-"}</Text>
                  </View>
                </>
              )}
            </View>
          );
        }}
      />

      {/* 5. Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => Alert.alert("Export PDF")}>
        <Ionicons name="download-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", position: "relative" },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#1E293B" },
  
  // Stats Card
  statsCard: {
    margin: 20,
    backgroundColor: "#063a5d",
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: "#063a5d",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  statsGrid: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  statItem: { alignItems: "center", width: "30%" },
  statLabel: { fontSize: 12, color: "rgba(255, 255, 255, 0.8)", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  // Filters
  filterSection: { 
    flexDirection: "row", 
    paddingHorizontal: 20, 
    marginBottom: 10,
    alignItems: "center"
  },
  monthDropdownWrap: { position: "relative" },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 10
  },
  monthText: { fontSize: 14, fontWeight: "600", marginRight: 5 },
  monthDropdown: {
    position: "absolute",
    top: 46,
    left: 0,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 6,
    minWidth: 170,
    maxHeight: 260,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 10,
  },
  monthOption: { paddingHorizontal: 12, paddingVertical: 8 },
  monthOptionText: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  filterDropdownWrap: { position: "relative" },
  filterSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  filterLabelWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterText: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  filterDropdown: {
    position: "absolute",
    top: 46,
    right: 0,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 6,
    minWidth: 150,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 10,
  },
  filterOption: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  filterOptionText: { fontSize: 13, fontWeight: "600", color: "#1E293B" },

  // List Cards
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  attendanceCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardDate: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { color: "white", fontSize: 11, fontWeight: "700" },
  timeInfo: { marginBottom: 12 },
  timeLabel: { fontSize: 15, color: "#64748B", marginBottom: 4 },
  timeValue: { color: "#1E293B", fontWeight: "700" },
  locationInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 13, color: "#94A3B8" },

  // FAB
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#4338CA",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  }
});