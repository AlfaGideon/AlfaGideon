import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TelegramProvider } from "@/components/telegram-provider";
import NotFound from "@/pages/not-found";
import Registration from "@/pages/registration";
import RoleSelection from "@/pages/role-selection";
import StudentDashboard from "@/pages/student-dashboard";
import TutorDashboard from "@/pages/tutor-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Registration} />
      <Route path="/roles" component={RoleSelection} />
      <Route path="/student" component={StudentDashboard} />
      <Route path="/tutor" component={TutorDashboard} />
      <Route path="/administrator" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TelegramProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </TelegramProvider>
    </QueryClientProvider>
  );
}

export default App;
