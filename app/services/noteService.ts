import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { Note } from "../../types/Note";

export const fetchNotes = async (): Promise<Note[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const q = query(collection(db, "notes"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    const data: Note[] = snapshot.docs.map(d => ({
        id: d.id,
        text: d.data().text,
    }));
    return data;
};

export const addNote = async (text: string): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const ref = await addDoc(collection(db, "notes"), {
        text,
        userId: user.uid,
        createdAt: new Date().toISOString(),
    });
    return ref.id;
};

export const deleteNote = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "notes", id));
};
