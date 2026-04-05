import { Suspense } from "react";
import { Route, Switch } from "wouter";
import AppLayout from "./layouts/AppLayout";
import GatewayPage from "./pages/GatewayPage";
import ProviderPage from "./pages/ProviderPage";
import { AppInitializer } from "./components/AppInitializer";

function App() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AppInitializer>
        <AppLayout>
          <Switch>
            <Route path="/" component={GatewayPage} />
            <Route path="/provider" component={ProviderPage} />
          </Switch>
        </AppLayout>
      </AppInitializer>
    </Suspense>
  );
}

export default App;
