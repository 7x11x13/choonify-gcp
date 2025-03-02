import React from "react";
import { Route, Switch } from "wouter";
import AuthenticatedRoute from "./components/AuthenticatedRoute.tsx";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute.tsx";
import Home from "./containers/Home.tsx";
import NotFound from "./containers/NotFound.tsx";
import AdWrap from "./components/AdWrap.tsx";

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
          <AdWrap>
            <Home />
          </AdWrap>
        </UnauthenticatedRoute>
      </Route>
      <Route path="/pricing">
        <Pricing />
      </Route>
      <Route path="/support">
        <AdWrap>
          <Support />
        </AdWrap>
      </Route>
      <Route path="/documentation">
        <AdWrap>
          <Documentation />
        </AdWrap>
      </Route>
      <Route path="/upload">
        <AuthenticatedRoute>
          <AdWrap>
            <Upload />
          </AdWrap>
        </AuthenticatedRoute>
      </Route>
      <Route path="/settings">
        <AuthenticatedRoute>
          <AdWrap>
            <Settings />
          </AdWrap>
        </AuthenticatedRoute>
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}
