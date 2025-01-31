import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithRedirect, signOut, User } from "firebase/auth";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ChoonifyUserInfo } from "../types/auth";

const AuthContext = createContext<{
    user: User | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    userInfo: ChoonifyUserInfo | null;
}>({
    user: null,
    signIn: async () => { },
    signOut: async () => { },
    userInfo: null,
});

export const useAuth = () => useContext(AuthContext);

export function ProvideAuth({ children }: { children: any }) {
    const auth = useProvideAuth();
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

function useProvideAuth() {
    const auth = getAuth();
    auth.useDeviceLanguage();
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/youtube.readonly");
    provider.addScope("https://www.googleapis.com/auth/youtube.upload");
    const [user, setUser] = useState<User | null>(auth.currentUser);

    onAuthStateChanged(auth, (user) => {
        // todo: get userinfo from db
        setUser(user);
    });

    async function signIn() {
        await signInWithRedirect(auth, provider);
    };

    async function realSignOut() {
        await signOut(auth);
    }

    return {
        user,
        signIn,
        signOut: realSignOut,
        userInfo: null,
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