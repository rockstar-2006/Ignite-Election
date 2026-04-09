'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createUserProfile, getUserProfile } from "@/lib/db";
import { parseSemesterFromEmail } from "@/lib/constants";
import { compressImage } from "@/lib/image-compression";
import { Camera, ShieldCheck, ArrowRight, Info, AlertTriangle, CheckCircle } from "lucide-react";

export default function ProfileSetup() {
  const { user, loading: authLoading, semester: authSemester, isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    usn: "",
    phone: "",
    backlogStatus: "select" as "select" | "yes" | "no",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "saving" | "verifying">("idle");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    } else if (isAdmin) {
      // Admins should go to admin panel, not profile setup
      console.log("User is admin, redirecting to admin panel");
      router.push("/admin");
    } else if (user?.email) {
      getUserProfile(user.email).then((profile) => {
        if (profile) {
          router.push("/dashboard");
        }
      }).catch(err => {
        console.error("Error checking profile:", err);
      });
    }
  }, [user, authLoading, router, isAdmin]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size - must be under 5MB raw (compression will reduce further)
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 5) {
        setError(`Photo exceeds maximum size (${sizeMB.toFixed(2)}MB). Please upload an image smaller than 5MB.`);
        setPhoto(null);
        setPhotoPreview(null);
        setPhotoSize(null);
        return;
      }
      
      // Warn if file is very large
      if (sizeMB > 3) {
        console.warn(`Large image selected: ${sizeMB.toFixed(2)}MB - will be compressed during upload`);
      }
      
      setError(null);
      setPhoto(file);
      setPhotoSize(`${(file.size / 1024).toFixed(1)} KB`);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || formData.backlogStatus !== 'no') return;
    if (!photo) {
      setError("Please upload your profile photo to continue.");
      return;
    }

    setLoading(true);
    setUploadStage("uploading");
    setError(null);
    
    let retries = 0;
    const maxRetries = 2;
    
    const attemptProfileCreation = async (): Promise<void> => {
      try {
        console.log("Profile setup: Compressing photo...");
        
        // Compress image to fit in Firestore (max ~1MB per field)
        const photoBase64 = await compressImage(photo, 800, 1000, 0.8);
        console.log("Profile setup: Photo compressed successfully");
        
        setUploadStage("saving");
        console.log("Profile setup: Creating user profile...");
        
        await createUserProfile({
          email: user.email!,
          firstName: formData.firstName,
          lastName: formData.lastName,
          usn: formData.usn.toUpperCase(),
          phone: formData.phone,
          hasBacklogs: false,
          semester: (authSemester || (user?.email ? parseSemesterFromEmail(user.email) : null) || "Unknown") as string,
          photoURL: photoBase64,
        });

        // Wait for Firestore to sync across replicas
        console.log("Profile saved to Firestore, waiting for sync...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setUploadStage("verifying");
        console.log("Profile setup: Verifying profile was saved...");
        
        const verifyProfile = await getUserProfile(user.email!);
        if (verifyProfile) {
          console.log("✅ Profile verified successfully, redirecting to dashboard");
          setUploadStage("idle");
          setLoading(false);
          router.push("/dashboard");
        } else {
          throw new Error("Profile could not be verified. Please try again.");
        }
      } catch (error: any) {
        if (retries < maxRetries) {
          retries++;
          console.warn(`Attempt ${retries} failed, retrying...`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          return attemptProfileCreation();
        } else {
          throw error;
        }
      }
    };
    
    try {
      await attemptProfileCreation();
    } catch (error: any) {
      console.error("Profile setup failed:", error);
      
      // Provide specific, professional error messages
      let userMessage = error.message;
      if (error.message?.includes("Compressed image too large")) {
        userMessage = "Photo is too large even after compression. Please use a lower resolution image.";
      } else if (error.message?.includes("Failed to load image")) {
        userMessage = "Could not process the image. Please ensure it's a valid JPEG or PNG file.";
      } else if (error.message?.includes("Could not be verified")) {
        userMessage = "Profile saved but verification failed. Please refresh the page and try again.";
      } else if (!userMessage) {
        userMessage = "An error occurred while saving your profile. Please check your internet connection and try again.";
      }
      
      setError(userMessage);
      setUploadStage("idle");
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    let message = "LOADING...";
    if (uploadStage === "uploading") message = "COMPRESSING PHOTO...";
    if (uploadStage === "saving") message = "SAVING PROFILE...";
    if (uploadStage === "verifying") message = "VERIFYING PROFILE...";
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          <p className="text-slate-500 font-bold text-xs">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 bg-[#F1F5F9] font-sans">
      <div className="max-w-xl mx-auto animate-fade-in">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
          {/* Simple Header */}
          <div className="bg-[#1e3a8a] py-8 px-6 text-center">
             <h1 className="text-2xl font-black text-white uppercase tracking-tight">Create Your Profile</h1>
             <p className="text-blue-100 text-xs font-bold mt-1 uppercase tracking-widest">Step 1: Enter your details</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Simple Photo Upload */}
            <div className="flex flex-col items-center pb-6 border-b border-slate-100">
              <label className="relative cursor-pointer group">
                <div className="w-28 h-36 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden flex items-center justify-center transition-all hover:border-blue-500">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <Camera className="w-8 h-8 text-slate-400" />
                       <span className="text-[10px] font-black text-slate-400">TAP TO ADD PHOTO</span>
                    </div>
                  )}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </label>
              {photoSize && (
                <p className="text-[10px] text-slate-500 font-bold mt-3">
                  File size: {photoSize} (Max: 5MB)
                </p>
              )}
            </div>

            {/* Simple Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="form-input text-sm font-bold h-12"
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Name</label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="form-input text-sm font-bold h-12"
                    placeholder="Surname"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">University Seat Number (USN)</label>
                <input
                  required
                  type="text"
                  value={formData.usn}
                  onChange={(e) => setFormData({ ...formData, usn: e.target.value })}
                  className="form-input text-sm font-bold h-12"
                  placeholder="Example: 4SO22AD001"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number (WhatsApp)</label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input text-sm font-bold h-12"
                  placeholder="Example: 9876543210"
                />
              </div>
            </div>

            {/* Backlog Verification */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Are you eligible?</h3>
              <p className="text-[11px] text-slate-500 font-bold leading-tight uppercase tracking-tight">
                Important: Only students with NO BACKLOGS can apply.
              </p>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-800">Do you have any backlogs?</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, backlogStatus: 'yes' })}
                    className={`flex-1 py-3 rounded-xl border-2 font-black text-xs transition-all ${
                      formData.backlogStatus === 'yes' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    YES, I DO
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, backlogStatus: 'no' })}
                    className={`flex-1 py-3 rounded-xl border-2 font-black text-xs transition-all ${
                      formData.backlogStatus === 'no' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    NO, I DON'T
                  </button>
                </div>
              </div>

              {formData.backlogStatus === 'yes' && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-[10px] font-bold text-red-800">Sorry, you are NOT eligible to apply.</p>
                </div>
              )}

              {formData.backlogStatus === 'no' && (
                <div className="p-3 bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="text-[10px] font-bold text-emerald-800">Great! You are eligible to apply.</p>
                </div>
              )}
            </div>

            {formData.backlogStatus === 'no' && (
              <button
                type="submit"
                className="btn-academic w-full h-14 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg active:scale-95"
              >
                SAVE & CONTINUE
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {formData.backlogStatus === 'yes' && (
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full h-14 bg-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-xs"
              >
                GO BACK / LOGOUT
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
