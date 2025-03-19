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
const Readme = React.lazy(() => import("./containers/Readme.tsx"));

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
          <Readme namespace="support" />
        </AdWrap>
      </Route>
      <Route path="/documentation">
        <AdWrap>
          <Readme namespace="documentation" />
        </AdWrap>
      </Route>
      <Route path="/terms">
        <AdWrap>
          <Readme namespace="terms" />
        </AdWrap>
      </Route>
      <Route path="/privacy">
        <AdWrap>
          <Readme namespace="privacy" />
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
