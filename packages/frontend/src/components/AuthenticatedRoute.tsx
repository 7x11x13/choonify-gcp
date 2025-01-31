import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./Auth";

export default function AuthenticatedRoute({
    children,
}: {
    children: ReactElement;
}): ReactElement {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to={"/"} />;
    }

    return children;
}