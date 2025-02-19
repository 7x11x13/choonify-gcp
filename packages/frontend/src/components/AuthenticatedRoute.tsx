import { ReactElement } from "react";
import { Redirect } from "wouter";
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
                <Loader role="status"></Loader>
            </Center>
        )
    }

    if (!user || !userInfo) {
        return <Redirect to={"/"} />;
    }

    return children;
}