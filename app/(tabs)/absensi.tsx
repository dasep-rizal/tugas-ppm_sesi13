import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";

const { width } = Dimensions.get('window');

export default function Absensi() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [showPengajuan, setShowPengajuan] = useState(false);
  const [nowTick, setNowTick] = useState(() => new Date());

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    if (!user) return;
    const fetchAttendance = async () => {
      const q = query(
        collection(db, "attendance"),
        where("userId", "==", user.uid),
        where("date", "==", today)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        setDocId(d.id);
        setCheckInTime(d.data().checkIn);
        setCheckOutTime(d.data().checkOut);
      }
    };
    fetchAttendance();
  }, [user]);

  useEffect(() => {
    setNowTick(new Date());
  }, [checkInTime, checkOutTime]);

  useEffect(() => {
    if (!checkInTime || checkOutTime) return;
    const timer = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, [checkInTime, checkOutTime]);

  const parseTimeToSeconds = (timeValue: string | null) => {
    if (!timeValue) return null;
    const match = timeValue.match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = match[3] ? Number(match[3]) : 0;
    const meridiemMatch = timeValue.match(/\b(AM|PM)\b/i);
    if (meridiemMatch) {
      const meridiem = meridiemMatch[1].toUpperCase();
      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
    }
    return hours * 3600 + minutes * 60 + seconds;
  };

  const workSeconds = 8 * 60 * 60;
  const checkInSeconds = parseTimeToSeconds(checkInTime);
  const checkOutSeconds = parseTimeToSeconds(checkOutTime);
  const currentSeconds = nowTick.getHours() * 3600 + nowTick.getMinutes() * 60 + nowTick.getSeconds();
  const endSeconds = checkOutSeconds ?? currentSeconds;
  let elapsedSeconds = checkInSeconds != null ? endSeconds - checkInSeconds : 0;
  if (elapsedSeconds < 0) elapsedSeconds += 24 * 60 * 60;
  elapsedSeconds = Math.min(Math.max(elapsedSeconds, 0), workSeconds);
  const remainingSeconds = checkInSeconds != null ? Math.max(workSeconds - elapsedSeconds, 0) : workSeconds;
  const progress = checkInSeconds != null ? remainingSeconds / workSeconds : 1;
  const remainingHours = Math.floor(remainingSeconds / 3600);
  const remainingMins = Math.floor((remainingSeconds % 3600) / 60);
  const remainingSecs = remainingSeconds % 60;
  const formatTwoDigits = (value: number) => String(value).padStart(2, "0");
  const remainingCompact = `${formatTwoDigits(remainingHours)}:${formatTwoDigits(remainingMins)}:${formatTwoDigits(remainingSecs)}`;
  const statusText = !checkInTime ? "Belum Check-in" : checkOutTime ? "Selesai" : "Sedang bekerja";
  const statusColor = !checkInTime ? "#94A3B8" : checkOutTime ? "#2563EB" : "#16A34A";
  const statusBg = !checkInTime ? "#F1F5F9" : checkOutTime ? "#DBEAFE" : "#F0FDF4";
  const statusBorder = !checkInTime ? "#E2E8F0" : checkOutTime ? "#BFDBFE" : "#DCFCE7";
  const statusIcon = !checkInTime ? "time-outline" : checkOutTime ? "checkmark-done" : "checkmark-circle";

  const ringSize = 150;
  const ringStroke = 12;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);

  const handleCheckIn = async () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      const ref = await addDoc(collection(db, "attendance"), {
        userId: user?.uid,
        email: user?.email,
        checkIn: time,
        checkOut: null,
        date: today,
        status: "Tepat Waktu",
        location: "Kantor Pusat (WFO)",
        createdAt: serverTimestamp(),
      });
      setDocId(ref.id);
      setCheckInTime(time);
      Alert.alert("Berhasil", "Sudah Check-in");
    } catch (e) {
      Alert.alert("Error", "Gagal melakukan absensi.");
    }
  };

  const handleCheckOut = async () => {
    if (!docId) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await updateDoc(doc(db, "attendance", docId), { checkOut: time });
    setCheckOutTime(time);
    Alert.alert("Berhasil", "Sudah Check-out");
  };

  const handleOpenPengajuan = () => {
    setShowPengajuan((prev) => !prev);
  };

  if (loading || !user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Absensi Hari Ini</Text>
        </View>

        {/* 1. Progress Circle (Waktu Kerja) */}
        <View style={styles.chartContainer}>
          <View style={styles.circleContainer}>
            <Svg width={ringSize} height={ringSize}>
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke="#E2E8F0"
                strokeWidth={ringStroke}
                fill="none"
              />
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke="#22C55E"
                strokeWidth={ringStroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                strokeDashoffset={ringOffset}
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <View style={styles.circleInner}>
              <Text style={styles.workDuration}>{remainingCompact}</Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}
          >
            <Ionicons name={statusIcon as any} size={16} color={statusColor} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
          <Text style={styles.chartHint}>Waktu Kerja Anda</Text>
        </View>

        {/* 2. Action Buttons (Check-in & Check-out) */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.activeBtn, checkInTime && styles.disabledBtn]} 
            onPress={handleCheckIn}
            disabled={!!checkInTime}
          >
            <Ionicons name="time-outline" size={20} color="white" />
            <View>
              <Text style={styles.btnLabelWhite}>Check-in</Text>
              <Text style={styles.btnTimeWhite}>{checkInTime ?? "08:00 AM"}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.inactiveBtn, (!checkInTime || checkOutTime) && styles.disabledBtn]} 
            onPress={handleCheckOut}
            disabled={!checkInTime || !!checkOutTime}
          >
            <Ionicons name="time-outline" size={20} color="#1E293B" />
            <View>
              <Text style={styles.btnLabelGray}>Check-oout</Text>
              <Text style={styles.btnTimeGray}>{checkOutTime ?? "..."}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Location Card */}
        <View style={styles.locationCard}>
          <Ionicons name="location-sharp" size={18} color="#4338CA" />
          <Text style={styles.locationText}>Lokasi: Kantor Peusat (WFO)</Text>
        </View>

        {/* 4. Aktivitas Hari Ini (List) */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Aktivitas Hari Ini</Text>
          
          <ActivityItem 
            color="#22C55E" 
            label="Masuk" 
            desc="Mencatat kehadiran" 
            time={checkInTime ?? "08:00"} 
          />
          <ActivityItem 
            color="#3B82F6" 
            label="Mulai Kerja" 
            desc="Mengerjakan projek X" 
            time="08:15" 
          />
          <ActivityItem 
            color="#FACC15" 
            label="Istriatah" 
            desc="Makan siang" 
            time="12:00" 
          />
          <ActivityItem 
            color="#FACC15" 
            label="Makan siang" 
            desc="" 
            time="08:00" 
          />
        </View>

        <View style={{height: 120}} />
      </ScrollView>

      {showPengajuan && (
        <View style={styles.pengajuanOverlay}>
          <Pressable
            style={styles.pengajuanBackdrop}
            onPress={() => setShowPengajuan(false)}
          />
          <View style={styles.pengajuanCard}>
            <View style={styles.pengajuanHeader}>
              <Text style={styles.pengajuanTitle}>Pengajuan Absensi</Text>
            </View>
            <View style={styles.pengajuanRow}>
              <TouchableOpacity
                style={styles.pengajuanItem}
                onPress={() => router.push("/(tabs)/absen/pengajuan-izin")}
              >
                <View style={[styles.pengajuanIconWrap, styles.pengajuanIconBlue]}>
                  <Ionicons name="document-text-outline" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.pengajuanLabel}>Izin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pengajuanItem}
                onPress={() => router.push("/(tabs)/absen/sakit")}
              >
                <View style={[styles.pengajuanIconWrap, styles.pengajuanIconOrange]}>
                  <Ionicons name="medkit-outline" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.pengajuanLabel}>Sakit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pengajuanItem}
                onPress={() => router.push("/(tabs)/absen/cuti")}
              >
                <View style={[styles.pengajuanIconWrap, styles.pengajuanIconGreen]}>
                  <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.pengajuanLabel}>Cuti</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenPengajuan}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Sub-component untuk List Aktivitas
const ActivityItem = ({ color, label, desc, time }: any) => (
  <View style={styles.activityCard}>
    <View style={styles.activityInfo}>
      <View style={[styles.activityDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.activityLabel}>{label}</Text>
        <Text style={styles.activityDesc}>{desc}</Text>
      </View>
    </View>
    <Text style={styles.activityTime}>{time}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: { alignItems: 'center', paddingVertical: 20 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B" },

  // Progress Circle
  chartContainer: { alignItems: 'center', marginBottom: 20 },
  circleContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workDuration: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  workDurationSub: { fontSize: 16, color: '#1E293B', fontWeight: '600' },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 10,
    gap: 4
  },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#16A34A' },
  chartHint: { marginTop: 10, fontSize: 12, color: '#94A3B8' },

  // Action Buttons
  actionRow: { flexDirection: 'row', paddingHorizontal: 25, gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 25,
    gap: 8,
  },
  activeBtn: { backgroundColor: '#312E81' },
  inactiveBtn: { backgroundColor: '#F1F5F9' },
  disabledBtn: { opacity: 0.8 },
  btnLabelWhite: { color: 'white', fontSize: 11, fontWeight: '500' },
  btnTimeWhite: { color: 'white', fontSize: 13, fontWeight: '700' },
  btnLabelGray: { color: '#1E293B', fontSize: 11, fontWeight: '600' },
  btnTimeGray: { color: '#64748B', fontSize: 13, fontWeight: '700' },

  // Location
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 25,
    marginTop: 15,
    padding: 12,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  locationText: { color: '#64748B', fontSize: 12, fontWeight: '500' },

  // Activity Section
  activitySection: { marginTop: 25, paddingHorizontal: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 15 },
  activityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  activityInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityDot: { width: 14, height: 24, borderRadius: 6 },
  activityLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  activityDesc: { fontSize: 11, color: '#94A3B8' },
  activityTime: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    backgroundColor: '#312E81',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#312E81',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  }
  ,
  // Pengajuan Card
  pengajuanOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
  pengajuanBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  pengajuanCard: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    width: 220,
    backgroundColor: '#1E40AF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    elevation: 6,
    shadowColor: '#1E40AF',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  pengajuanHeader: { marginBottom: 8 },
  pengajuanTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  pengajuanRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pengajuanItem: { alignItems: 'center', flex: 1 },
  pengajuanIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  pengajuanIconBlue: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  pengajuanIconOrange: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  pengajuanIconGreen: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  pengajuanLabel: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
});