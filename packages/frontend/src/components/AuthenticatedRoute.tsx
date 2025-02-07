import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./Auth";
import { Center, Loader } from "@mantine/core";

export default function AuthenticatedRoute({
    children,
}: {
    children: ReactElement;
}): ReactElement {
    const { loading, user, userInfo } = useAuth();

    if (loading) {
        return (
            <Center>
                <Loader role="status">
                    <span className="visually-hidden">Loading...</span>
                </Loader>
            </Center>
        )
    }

    if (!user || !userInfo) {
        return <Navigate to={"/"} />;
    }

    return children;
}