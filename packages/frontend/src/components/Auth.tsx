import { notifications } from "@mantine/notifications";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ChoonifyUserInfo } from "../types/auth";

const AuthContext = createContext<{
    loading: boolean;
    user: User | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    userInfo: ChoonifyUserInfo | null;
    refreshUserInfo: () => Promise<void>;
}>({
    loading: true,
    user: null,
    signIn: async () => { },
    signOut: async () => { },
    userInfo: null,
    refreshUserInfo: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function ProvideAuth({ children }: { children: any }) {
    const auth = useProvideAuth();
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

function useProvideAuth() {
    const auth = getAuth();
    auth.useDeviceLanguage();
    const [user, setUser] = useState<User | null>(auth.currentUser);
    const [userInfo, setUserInfo] = useState<ChoonifyUserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    // async function handleRedirectResult() {
    //     const creds = await getRedirectResult(auth);
    //     console.log("redirect result:", creds);
    //     if (creds) {
    //         setUser(creds.user);
    //         await refreshUserInfo();
    //     }
    // }

    useEffect(() => {
        // handleRedirectResult();
        onAuthStateChanged(auth, async (newUser) => {
            console.log(newUser);
            setUser(newUser);
        });
    }, []);

    useEffect(() => {
        setLoading(true);
        refreshUserInfo();
    }, [user]);

    async function signIn() {
        const provider = new GoogleAuthProvider();
        // provider.addScope("https://www.googleapis.com/auth/youtube.readonly");
        // provider.addScope("https://www.googleapis.com/auth/youtube.upload");
        // await signInWithRedirect(auth, provider);
        await signInWithPopup(auth, provider);
    };

    async function realSignOut() {
        await signOut(auth);
    }

    async function refreshUserInfo() {
        console.log(user);
        if (!user) {
            setUserInfo(null);
            setLoading(false);
            return;
        }
        const db = getFirestore();
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            setUserInfo(docSnap.data() as ChoonifyUserInfo);
        } else {
            notifications.show({
                title: 'Error',
                message: 'Could not refresh user info',
                color: 'red',
            });
        }
        setLoading(false);
    }

    return {
        loading,
        user,
        signIn,
        signOut: realSignOut,
        userInfo,
        refreshUserInfo: refreshUserInfo
    };
}

export function useGSI() {
    const clientLoaded = useRef(false);
    useEffect(() => {
        const script = document.createElement('script');
        const body = document.getElementsByTagName('head')[0];
        script.src = 'https://accounts.google.com/gsi/client';
        script.defer = true;
        body.appendChild(script);
        script.addEventListener('load', () => {
            clientLoaded.current = true;
        });
    }, []);
    return clientLoaded;
}