import { Route, Switch } from "wouter";
import AppLayout from "./layouts/AppLayout";
import GatewayPage from "./pages/GatewayPage";
import ProviderPage from "./pages/ProviderPage";

function App() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={GatewayPage} />
        <Route path="/provider" component={ProviderPage} />
      </Switch>
    </AppLayout>
  );
}

export default App;
