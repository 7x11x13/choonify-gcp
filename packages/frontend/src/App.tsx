import { AppShell, Group } from "@mantine/core";
import Routes from "./Routes.tsx";

import { Header } from "./components/Header.tsx";
import { Suspense } from "react";
import Loading from "./components/Loading.tsx";
import AdContainer from "./components/AdContainer.tsx";

function App() {
  return (
    <AppShell mah="100vh" h="100vh">
      <Header></Header>
      <AppShell.Main m="md">
        <Suspense fallback={<Loading />}>
          <Routes />
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
