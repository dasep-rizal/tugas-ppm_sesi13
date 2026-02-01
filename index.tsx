import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

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
import { db } from "../config/firebase";

export default function Index() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/Auth-screen/Login");
    }
    if (user) {
      checkTodayAttendance();
    }
  }, [user, loading]);

  const checkTodayAttendance = async () => {
    if (!user) return;

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
  };

  const handleCheckIn = async () => {
    if (!user) return;

    try {
      const time = new Date().toLocaleTimeString();

      const docRef = await addDoc(collection(db, "attendance"), {
        userId: user.uid,
        email: user.email,
        checkIn: time,
        checkOut: null,
        date: today,
        createdAt: serverTimestamp(),
      });

      setCheckInTime(time);
      setDocId(docRef.id);
      Alert.alert("Berhasil", "Absen masuk berhasil");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Terjadi kesalahan"
      );
    }
  };

  const handleCheckOut = async () => {
    if (!user || !docId) return;

    try {
      const time = new Date().toLocaleTimeString();

      await updateDoc(doc(db, "attendance", docId), {
        checkOut: time,
      });

      setCheckOutTime(time);
      Alert.alert("Berhasil", "Absen pulang berhasil");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Terjadi kesalahan"
      );
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/Auth-screen/Login");
    } catch {
      Alert.alert("Error", "Gagal logout");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Sistem Absensi</Text>
            <Text style={styles.subtitle}>{today}</Text>
          </View>

          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card Absensi */}
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user.email}</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Masuk</Text>
            <Text style={styles.time}>
              {checkInTime || "-- : --"}
            </Text>
          </View>

          <View>
            <Text style={styles.label}>Pulang</Text>
            <Text style={styles.time}>
              {checkOutTime || "-- : --"}
            </Text>
          </View>
        </View>
      </View>

      {/* Tombol */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            checkInTime && styles.disabledButton,
          ]}
          disabled={!!checkInTime}
          onPress={handleCheckIn}
        >
          <Text style={styles.buttonText}>ABSEN MASUK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            (!checkInTime || checkOutTime) && styles.disabledButton,
          ]}
          disabled={!checkInTime || !!checkOutTime}
          onPress={handleCheckOut}
        >
          <Text style={styles.buttonText}>ABSEN PULANG</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginTop: 30,
    marginBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1E293B",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 10,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
  },
  time: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
  },
  buttonContainer: {
    marginTop: 40,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: "#94A3B8",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
