import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthContext } from "./context/AuthContext";

// Páginas públicas
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";

// Registro
import AuthChoice from "./pages/register/AuthChoice";
import RegisterDetail from "./pages/register/user/RegisterDetail";
import RegisterVerification from "./pages/register/RegisterVerification";

// Registro prestador
import RegisterProfile from "./pages/register/provider/RegisterProfile";
import RegisterProviderDetail from "./pages/register/provider/RegisterDetail";

// Páginas usuario cliente
import Profile from "./pages/Profile";
import Requests from "./pages/Requests";
import EditProfile from "./pages/user/EditProfile";
import Favorites from "./pages/user/Favorites";
import History from "./pages/user/History";
import Notification from "./pages/user/Notification";
import Chat from "./pages/user/Chat";
import Settings from "./pages/user/Settings";
import PaymentMethods from "./pages/user/PaymentMethods";
import Categories from "./pages/categories/Categories";
import CategoryList from "./pages/categories/CategoryList";
import ProvidersList from "./pages/providers/ProvidersList";
import ProviderProfile from "./pages/providers/ProviderProfile";
import CalendarPage from "./pages/booking/CalendarPage";
import ServiceDetail from "./pages/booking/ServicesDetail";
import ProblemForm from "./pages/forms/ProblemForm";
import HelpCenter from "./pages/legal/HelpCenter";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Terms from "./pages/legal/Terms";
import DataUsage from "./pages/legal/DataUsage";
import AddPayment from "./components/AddPayment";
import BookingPage from "./pages/booking/BookingPage";


export default function App() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2A4691]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-[#1F315C] rounded-full animate-spin"></div>
          <h2 className="mt-6 text-2xl font-semibold text-white">
            Cargando Orby...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {user ? (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/service-detail" element={<ServiceDetail />} />
            <Route path="/notification" element={<Notification />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/history" element={<History />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/add-payment" element={<AddPayment />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/category/:categoryId" element={<CategoryList />} />
            <Route
              path="/providers/:categoryId/:serviceId"
              element={<ProvidersList />}
            />
            <Route
              path="/provider/:idPrestador"
              element={<ProviderProfile />}
            />
            <Route path="/problem-form" element={<ProblemForm />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/data-usage" element={<DataUsage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/booking/:providerId" element={<BookingPage />} />

          </>
        ) : (
          <>
            <Route path="/" element={<Welcome />} />
            <Route path="/auth" element={<AuthChoice />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/register-detail" element={<RegisterDetail />} />
            <Route
              path="/register-verification"
              element={<RegisterVerification />}
            />

            <Route
              path="/register/provider"
              element={<RegisterProfile />}
            />
            <Route
              path="/register/provider/detail"
              element={<RegisterProviderDetail />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}