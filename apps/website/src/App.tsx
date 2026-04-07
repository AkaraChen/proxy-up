import { Suspense } from "react";
import { Route, Switch } from "wouter";
import { Toast } from "@heroui/react";
import AppLayout from "./layouts/AppLayout";
import GatewayPage from "./pages/GatewayPage";
import ProviderPage from "./pages/ProviderPage";
import SettingsPage from "./pages/SettingsPage";
import { AppInitializer } from "./components/AppInitializer";

function App() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AppInitializer>
        <Toast.Provider placement="bottom end" />
        <AppLayout>
          <Switch>
            <Route path="/" component={GatewayPage} />
            <Route path="/provider" component={ProviderPage} />
            <Route path="/settings" component={SettingsPage} />
          </Switch>
        </AppLayout>
      </AppInitializer>
    </Suspense>
  );
}

export default App;
