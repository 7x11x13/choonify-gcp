import React from "react";
import { Route, Switch } from "wouter";
import AuthenticatedRoute from "./components/AuthenticatedRoute.tsx";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute.tsx";
import Home from "./containers/Home.tsx";
import NotFound from "./containers/NotFound.tsx";

const Pricing = React.lazy(() => import("./containers/Pricing.tsx"));
const Upload = React.lazy(() => import("./containers/Upload.tsx"));
const Settings = React.lazy(() => import("./containers/Settings.tsx"));
const Support = React.lazy(() => import("./containers/Support.tsx"));
const Documentation = React.lazy(
  () => import("./containers/Documentation.tsx"),
);

export default function Routes() {
  return (
    <Switch>
      <Route path="/">
        <UnauthenticatedRoute to={"/upload"}>
          <Home />
        </UnauthenticatedRoute>
      </Route>
      <Route path="/pricing">
        <Pricing />
      </Route>
      <Route path="/support">
        <Support />
      </Route>
      <Route path="/documentation">
        <Documentation />
      </Route>
      <Route path="/upload">
        <AuthenticatedRoute>
          <Upload />
        </AuthenticatedRoute>
      </Route>
      <Route path="/settings">
        <AuthenticatedRoute>
          <Settings />
        </AuthenticatedRoute>
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}
