import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Header } from "./components/Header";
import { HomePage } from "./pages/HomePage";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { PaymentCancel } from "./pages/PaymentCancel";
import { SavedEvaluations } from "./pages/SavedEvaluations";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-cancel" element={<PaymentCancel />} />
            <Route path="/my-evaluations" element={<SavedEvaluations />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}