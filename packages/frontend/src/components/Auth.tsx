import { notifications } from "@mantine/notifications";
import { getAuth, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, User } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ChoonifyUserInfo } from "../types/auth";

const AuthContext = createContext<{
    user: User | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    userInfo: ChoonifyUserInfo | null;
    refreshUserInfo: () => Promise<void>;
}>({
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
            setUser(newUser);
            await refreshUserInfo();
        });
    }, []);

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
            return;
        }
        const db = getFirestore();
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            setUserInfo(docSnap.data() as ChoonifyUserInfo);
            console.log(docSnap.data());
            console.log(userInfo);
        } else {
            notifications.show({
                title: 'Error',
                message: 'Could not refresh user info',
                color: 'red',
            });
        }
    }

    return {
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