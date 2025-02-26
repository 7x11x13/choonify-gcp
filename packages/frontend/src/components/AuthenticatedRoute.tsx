import { ReactElement } from "react";
import { Redirect } from "wouter";
import { useAuth } from "./Auth";
import Loading from "./Loading";

export default function AuthenticatedRoute({
    children,
}: {
    children: ReactElement;
}) {
    const { loading, user, userInfo } = useAuth();

    if (loading) {
        return <Loading />;
    }

    if (!user || !userInfo) {
        return <Redirect to={"/"} />;
    }

    return children;
}