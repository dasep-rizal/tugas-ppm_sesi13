import { auth } from "../../config/firebase";

export const signOut = async (): Promise<void> => {
    await auth.signOut();
};
