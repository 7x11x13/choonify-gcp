import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./Auth";
import { Center, Loader } from "@mantine/core";

export default function UnauthenticatedRoute({
    children,
    to
}: {
    children: ReactElement;
    to: string;
}): ReactElement {
    const { loading, user, userInfo } = useAuth();

    if (loading) {
        return (
            <Center>
                <Loader role="status"></Loader>
            </Center>
        )
    }

    if (user && userInfo) {
        return <Navigate to={to} />;
    }

    return children;
}