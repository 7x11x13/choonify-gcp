import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./Auth";

export default function UnauthenticatedRoute({
    children,
    to
}: {
    children: ReactElement;
    to: string;
}): ReactElement {
    const { user } = useAuth();

    if (user) {
        return <Navigate to={to} />;
    }

    return children;
}