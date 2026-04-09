import { db } from "./firebase";

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  usn: string;
  phone: string;
  semester: string;
  photoURL: string;
  hasBacklogs: boolean;
  nominations: string[];
  createdAt: any;
}

export async function getUserProfile(email: string): Promise<UserProfile | null> {
  if (!email) return null;
  
  try {
    // Use API route instead of direct Firestore access
    const response = await fetch('/api/profile/get', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn("User not authenticated");
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.profile || null;
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    throw error;
  }
}

export async function createUserProfile(profile: Partial<UserProfile>) {
  if (!profile.email) throw new Error("Email is required");
  
  try {
    // Use API route instead of direct Firestore access
    const response = await fetch('/api/profile/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save profile');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to create user profile:", error);
    throw error;
  }
}

export async function updateNomination(email: string, nominations: string[]) {
  if (!email) throw new Error("Email is required");
  
  try {
    // Use API route instead of direct Firestore access
    const response = await fetch('/api/profile/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        nominations,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update nominations');
    }
  } catch (error) {
    console.error("Failed to update nominations:", error);
    throw error;
  }
}

export async function getAllCandidates(): Promise<UserProfile[]> {
  try {
    // Use API route instead of direct Firestore access
    const response = await fetch('/api/candidates', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn("User not authenticated");
        return [];
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates || [];
  } catch (error) {
    console.error("Failed to fetch candidates:", error);
    return [];
  }
}

export async function getApplicantsPerPost() {
  try {
    // Use existing stats API route
    const response = await fetch('/api/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.stats || {};
  } catch (error) {
    console.error("Failed to fetch applicants per post:", error);
    return {};
  }
}
