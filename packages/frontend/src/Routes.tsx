import { Route, Routes } from "react-router-dom";
import Home from "./containers/Home.tsx";
import NotFound from "./containers/NotFound.tsx";
import AuthenticatedRoute from "./components/AuthenticatedRoute.tsx";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute.tsx";
import React from "react";

const Upload = React.lazy(() => import("./containers/Upload.tsx"));
const Settings = React.lazy(() => import("./containers/Settings.tsx"));

export default function Links() {
    return (
        <Routes>
            <Route path="/" element={<UnauthenticatedRoute to={"/upload"}><Home /></UnauthenticatedRoute>} />
            <Route path="/upload" element={<AuthenticatedRoute><Upload /></AuthenticatedRoute>} />
            <Route path="/settings" element={<AuthenticatedRoute><Settings /></AuthenticatedRoute>} />
            <Route path="*" element={<NotFound />} />;
        </Routes>
    );
}