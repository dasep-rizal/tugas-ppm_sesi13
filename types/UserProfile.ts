export interface UserProfile {
  userId: string;
  namaLengkap: string;
  nomorInduk: string;
  jabatan: string;
  fotoProfil?: string; // Base64 atau URL
  createdAt?: Date;
  updatedAt?: Date;
}
