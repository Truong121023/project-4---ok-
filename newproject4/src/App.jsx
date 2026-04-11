import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import SessionSecurityOverlay from "./components/SessionSecurityOverlay";
import SiteLayout from "./components/SiteLayout";
import AccountPage from "./pages/AccountPage";
import AIChatPage from "./pages/AIChatPage";
import AdminPage from "./pages/AdminPage";
import CartPage from "./pages/CartPage";
import DishDetailPage from "./pages/DishDetailPage";
import EventDetailPage from "./pages/EventDetailPage";
import EmployeePage from "./pages/EmployeePage";
import EventsPage from "./pages/EventsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import GoogleCompleteProfilePage from "./pages/GoogleCompleteProfilePage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MenuPage from "./pages/MenuPage";
import OrdersPage from "./pages/OrdersPage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import NewsPage from "./pages/NewsPage";
import RegisterPage from "./pages/RegisterPage";
import ReviewsPage from "./pages/ReviewsPage";
import StoreDetailPage from "./pages/StoreDetailPage";
import StoresPage from "./pages/StoresPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";

export default function App() {
  return (
    <BrowserRouter>
      <SessionSecurityOverlay />
      <Routes>
        <Route path="/" element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="stores/:storeKey" element={<StoreDetailPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="menu/:itemId" element={<DishDetailPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:eventKey" element={<EventDetailPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="news/:newsKey" element={<NewsDetailPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="complete-profile" element={<GoogleCompleteProfilePage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify-otp" element={<VerifyOtpPage />} />
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="cart" element={<CartPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="account/*" element={<AccountPage />} />
            <Route path="ai-chat" element={<AIChatPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderId" element={<OrdersPage />} />
            <Route path="payment/success" element={<PaymentStatusPage mode="success" />} />
            <Route path="payment/cancel" element={<PaymentStatusPage mode="cancel" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["STAFF", "SHIPPER"]} />}>
            <Route path="employee" element={<EmployeePage />} />
            <Route path="employee/orders/:orderId" element={<EmployeePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]} />}>
            <Route
              path="admin"
              element={
                <RouteErrorBoundary>
                  <AdminPage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="admin/orders/:orderId"
              element={
                <RouteErrorBoundary>
                  <AdminPage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="admin.html"
              element={
                <RouteErrorBoundary>
                  <AdminPage />
                </RouteErrorBoundary>
              }
            />
          </Route>

          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
