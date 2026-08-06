import * as admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

interface CheckAvailabilityData {
  email?: string;
  phoneNumber?: string;
  username?: string;
}

interface CheckAvailabilityResponse {
  emailAvailable?: boolean;
  phoneNumberAvailable?: boolean;
  usernameAvailable?: boolean;
}

export const checkAvailability = onCall<
  CheckAvailabilityData,
  Promise<CheckAvailabilityResponse>
>(async (request) => {
  const {email, phoneNumber, username} = request.data;

  if (!email && !phoneNumber && !username) {
    throw new HttpsError(
      "invalid-argument",
      "At least one field (email, phoneNumber, or username) must be provided."
    );
  }

  const refsToFetch: FirebaseFirestore.DocumentReference[] = [];
  const keys: Array<"email" | "phoneNumber" | "username"> = [];

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    refsToFetch.push(db.collection("emails").doc(normalizedEmail));
    keys.push("email");
  }

  if (phoneNumber) {
    refsToFetch.push(db.collection("phone_numbers").doc(phoneNumber.trim()));
    keys.push("phoneNumber");
  }

  if (username) {
    const normalizedUsername = username.trim().toLowerCase();
    refsToFetch.push(db.collection("usernames").doc(normalizedUsername));
    keys.push("username");
  }

  const snapshots = await db.getAll(...refsToFetch);
  const response: CheckAvailabilityResponse = {};

  snapshots.forEach((snap, index) => {
    const key = keys[index];
    const isAvailable = !snap.exists;

    if (key === "email") response.emailAvailable = isAvailable;
    if (key === "phoneNumber") response.phoneNumberAvailable = isAvailable;
    if (key === "username") response.usernameAvailable = isAvailable;
  });

  return response;
});

// Updated interface to support inputs and override option for defaults
interface UserProfileData {
  uid: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  rawPhoneNumber?: string | null;
  profilePhoto?: string | null;
  bio?: string;
  stats?: {
    countriesVisited?: number;
    citiesVisited?: number;
    trips?: number;
  };
  social?: {
    followers?: number;
    following?: number;
  };
  settings?: {
    isPrivate?: boolean;
    notificationsEnabled?: boolean;
  };
}

export const createUserProfile = onCall<UserProfileData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const {
    uid,
    username,
    firstName,
    lastName,
    email,
    phoneNumber,
    countryCode,
    rawPhoneNumber,
    profilePhoto,
    bio,
    stats,
    social,
    settings,
  } = request.data;

  if (request.auth.uid !== uid) {
    throw new HttpsError(
      "permission-denied",
      "Request is not authorized for this user."
    );
  }

  const batch = db.batch();
  const userRef = db.collection("users").doc(uid);

  const now = new Date().toISOString();

  // Construct complete user profile schema
  const userData = {
    // Identity
    uid,
    username: username || "",
    firstName: firstName || "",
    lastName: lastName || "",
    email: email || null,
    phoneNumber: phoneNumber || null,
    countryCode: countryCode || null,
    rawPhoneNumber: rawPhoneNumber || null,

    // Profile Info
    profilePhoto: profilePhoto || null,
    bio: bio || "",

    // Timestamps
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,

    // Statistics
    stats: {
      countriesVisited: stats?.countriesVisited ?? 0,
      citiesVisited: stats?.citiesVisited ?? 0,
      trips: stats?.trips ?? 0,
    },

    // Social Network
    social: {
      followers: social?.followers ?? 0,
      following: social?.following ?? 0,
    },

    // Preferences & Settings
    settings: {
      isPrivate: settings?.isPrivate ?? false,
      notificationsEnabled: settings?.notificationsEnabled ?? true,
    },
  };

  batch.set(userRef, userData, {merge: true});

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const emailRef = db.collection("emails").doc(normalizedEmail);
    batch.set(emailRef, {uid});
  }

  if (phoneNumber) {
    const phoneRef = db.collection("phone_numbers").doc(phoneNumber);
    batch.set(phoneRef, {uid});
  }

  if (username) {
    const normalizedUsername = username.trim().toLowerCase();
    const usernameRef = db.collection("usernames").doc(normalizedUsername);
    batch.set(usernameRef, {uid});
  }

  await batch.commit();
  return {success: true};
});
