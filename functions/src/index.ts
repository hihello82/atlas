import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// Re-using existing initialized db reference
const db = admin.firestore();

// Global configuration
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

/**
 * Checks if email, phoneNumber, or username are available.
 * Accessible by unauthenticated users before account creation.
 */
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

  // Fetch all requested lookup documents in a single parallel batch call
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

// Interface for input data
interface UserProfileData {
  uid: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  rawPhoneNumber?: string | null;
  photoURL?: string;
  isGoogleSignIn?: boolean;
}

export const createUserProfile = onCall<UserProfileData>(async (request) => {
  // Enforce authentication
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
    photoURL,
    isGoogleSignIn,
  } = request.data;

  // Authorization check
  if (request.auth.uid !== uid) {
    throw new HttpsError(
      "permission-denied",
      "Request is not authorized for this user."
    );
  }

  const batch = db.batch();

  // 1. Primary User Document
  const userRef = db.collection("users").doc(uid);
  const createdAtOrLastLogin = isGoogleSignIn ?
    {lastLoginAt: new Date().toISOString()} :
    {createdAt: new Date().toISOString()};

  const userData = {
    uid,
    username: username || "",
    firstName: firstName || "",
    lastName: lastName || "",
    email: email || null,
    phoneNumber: phoneNumber || null,
    countryCode: countryCode || null,
    rawPhoneNumber: rawPhoneNumber || null,
    ...(photoURL ? {photoURL} : {}),
    ...createdAtOrLastLogin,
  };
  batch.set(userRef, userData, {merge: true});

  // 2. Email Lookup Entry
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const emailRef = db.collection("emails").doc(normalizedEmail);
    batch.set(emailRef, {uid});
  }

  // 3. Phone Lookup Entry
  if (phoneNumber) {
    const phoneRef = db.collection("phone_numbers").doc(phoneNumber);
    batch.set(phoneRef, {uid});
  }

  // 4. Username Lookup Entry
  if (username) {
    const normalizedUsername = username.trim().toLowerCase();
    const usernameRef = db.collection("usernames").doc(normalizedUsername);
    batch.set(usernameRef, {uid});
  }

  await batch.commit();
  return {success: true};
});
