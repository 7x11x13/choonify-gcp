import { AppShell } from "@mantine/core";
import Routes from "./Routes.tsx";

import { Suspense } from "react";
import { Header } from "./components/Header.tsx";
import Loading from "./components/Loading.tsx";

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
