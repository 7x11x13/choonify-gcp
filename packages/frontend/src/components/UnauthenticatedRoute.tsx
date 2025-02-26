import { ReactElement } from "react";
import { Redirect } from "wouter";
import { useAuth } from "./Auth";
import Loading from "./Loading";

export default function UnauthenticatedRoute({
    children,
    to
}: {
    children: ReactElement;
    to: string;
}) {
    const { loading, user, userInfo } = useAuth();

    if (loading) {
        return <Loading />;
    }

    if (user && userInfo) {
        return <Redirect to={to} />;
    }

    return children;
}