import type { Auth, User } from "firebase/auth";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import config from "../config";
import { ChoonifyUserInfo } from "../types/auth";
import {
  displayError,
  displaySuccess,
  firebaseErrorToString,
} from "../util/log";
import { useTranslation } from "react-i18next";

const AuthContext = createContext<{
  loading: boolean;
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  userInfo: ChoonifyUserInfo | null;
  refreshUserInfo: (user?: User | null) => Promise<void>;
}>({
  loading: true,
  user: null,
  signIn: async () => {},
  signOut: async () => {},
  userInfo: null,
  refreshUserInfo: async (_?: User | null) => {},
});

export const useAuth = () => useContext(AuthContext);

export function ProvideAuth({ children }: { children: any }) {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

function useProvideAuth() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<ChoonifyUserInfo | null>(null); // TODO: listen for changes?
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<Auth | null>(null);

  async function initAuth() {
    const { getAuth, onAuthStateChanged } = await import("firebase/auth");
    const auth = getAuth();
    auth.useDeviceLanguage();
    setAuth(auth);
    // setUser(auth.currentUser);
    onAuthStateChanged(auth, async (newUser) => {
      setUser(newUser);
      await refreshUserInfo(newUser);
      setLoading(false);
    });
  }

  useEffect(() => {
    initAuth();
  }, []);

  async function signIn() {
    const { GoogleAuthProvider, signInWithPopup } = await import(
      "firebase/auth"
    );
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/youtube.readonly");
    provider.addScope("https://www.googleapis.com/auth/youtube.upload");
    provider.setCustomParameters({
      access_type: "offline",
      prompt: "consent",
    });
    try {
      setLoading(true);
      import("../containers/Upload.tsx"); // preload upload page
      await signInWithPopup(auth!, provider);
    } catch (err: any) {
      console.error(err);
      displayError(firebaseErrorToString(err));
      setLoading(false);
    }
  }

  async function realSignOut() {
    const { signOut } = await import("firebase/auth");
    await signOut(auth!);
    displaySuccess(t("api.auth.logged-out"));
  }

  async function refreshUserInfo(newUser?: User | null) {
    if (newUser === undefined) {
      newUser = user;
    }
    if (!newUser) {
      setUserInfo(null);
      return;
    }
    const { doc, getDoc, getFirestore } = await import("firebase/firestore");
    const db = getFirestore();
    const docRef = doc(db, "users", newUser.uid);
    const docSnap = await getDoc(docRef);

    const { getDefaultImageFile, getDefaultUserInfo } = await import(
      "../types/defaults"
    );

    if (docSnap.exists()) {
      const info = docSnap.data() as ChoonifyUserInfo;
      const defaults = info.settings.defaults;
      if (
        defaults.imageFile === config.settings.DEFAULT_COVER_IMAGE ||
        !defaults.imageFile
      ) {
        defaults.imageFile = config.settings.DEFAULT_COVER_IMAGE;
        defaults.imageFileBlob = getDefaultImageFile();
      } else {
        // fetch from s3
        const { downloadFile } = await import("../util/api");
        defaults.imageFileBlob = await downloadFile(
          defaults.imageFile,
          () => {},
        );
      }
      setUserInfo(info);
    } else {
      console.warn("User info not found, falling back to defaults");
      setUserInfo(getDefaultUserInfo());
    }
  }

  return {
    loading,
    user,
    signIn,
    signOut: realSignOut,
    userInfo,
    refreshUserInfo: refreshUserInfo,
  };
}

export function useGSI() {
  const clientLoaded = useRef(false);
  useEffect(() => {
    const script = document.createElement("script");
    const body = document.getElementsByTagName("head")[0];
    script.src = "https://accounts.google.com/gsi/client";
    script.defer = true;
    body.appendChild(script);
    script.addEventListener("load", () => {
      clientLoaded.current = true;
    });
    return () => {
      body.removeChild(script);
    };
  }, []);
  return clientLoaded;
}
