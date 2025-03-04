import { AppShell } from "@mantine/core";
import Routes from "./Routes.tsx";

import { Suspense } from "react";
import Header from "./components/Header.tsx";
import Footer from "./components/Footer.tsx";
import Loading from "./components/Loading.tsx";

function App() {
  return (
    <AppShell mah="100vh" h="100vh">
      <Header />
      <AppShell.Main m="md">
        <Suspense fallback={<Loading />}>
          <Routes />
        </Suspense>
      </AppShell.Main>
      <Footer />
    </AppShell>
  );
}

export default App;
