import { adminDb } from '../firebase-admin';
import { UserProfile } from '../db';

export async function getServerUserProfile(email: string): Promise<UserProfile | null> {
  if (!email) return null;
  
  try {
    const docRef = adminDb.collection("users").doc(email);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return docSnap.data() as UserProfile;
    }
  } catch (error) {
    console.error(`Failed to fetch profile for ${email} on server:`, error);
  }
  
  return null;
}

export async function getServerAllCandidates(): Promise<UserProfile[]> {
  try {
    const snapshot = await adminDb.collection("users")
      .where("nominations", "!=", [])
      .get();
      
    const candidates: UserProfile[] = [];
    snapshot.forEach((doc) => {
      candidates.push(doc.data() as UserProfile);
    });
    
    return candidates;
  } catch (error) {
    console.error("Failed to fetch all candidates on server:", error);
    return [];
  }
}
