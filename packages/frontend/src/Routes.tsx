import { Route, Switch } from "wouter";
import Home from "./containers/Home.tsx";
import NotFound from "./containers/NotFound.tsx";
import AuthenticatedRoute from "./components/AuthenticatedRoute.tsx";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute.tsx";
import React, { Suspense } from "react";
import { Center, Loader } from "@mantine/core";

const Pricing = React.lazy(() => import("./containers/Pricing.tsx"));
const Upload = React.lazy(() => import("./containers/Upload.tsx"));
const Settings = React.lazy(() => import("./containers/Settings.tsx"));

export default function Routes() {
    return (
        <Switch>
            <Suspense fallback={<Center><Loader /></Center>}>
                <Route path="/"><UnauthenticatedRoute to={"/upload"}><Home /></UnauthenticatedRoute></Route>
                <Route path="/pricing"><Pricing /></Route>
                <Route path="/upload"><AuthenticatedRoute><Upload /></AuthenticatedRoute></Route>
                <Route path="/settings"><AuthenticatedRoute><Settings /></AuthenticatedRoute></Route>
                <Route><NotFound /></Route>
            </Suspense>
        </Switch>
    );
}