import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import UiKitPage from "./pages/UiKitPage";
import AdminLayout from "./components/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import SessionSecurityOverlay from "./components/SessionSecurityOverlay";
import SiteLayout from "./components/SiteLayout";
import AccountPage from "./pages/AccountPage";
import AdminNewsPreviewPage from "./pages/AdminNewsPreviewPage";
import AdminHomePage from "./pages/AdminHomePage";
import AIChatPage from "./pages/AIChatPage";
import AdminPage from "./pages/AdminPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutResultPage from "./pages/CheckoutResultPage";
import DishDetailPage from "./pages/DishDetailPage";
import EventDetailPage from "./pages/EventDetailPage";
import EmployeePage from "./pages/EmployeePage";
import EventsPage from "./pages/EventsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import GoogleCompleteProfilePage from "./pages/GoogleCompleteProfilePage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MenuPage from "./pages/MenuPage";
import MembershipPage from "./pages/MembershipPage";
import OperationDetailPage from "./pages/OperationDetailPage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import PromotionsPage from "./pages/PromotionsPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import NewsPage from "./pages/NewsPage";
import OrdersPage from "./pages/OrdersPage";
import RegisterPage from "./pages/RegisterPage";
import ReportsPage from "./pages/ReportsPage";
import ReviewsPage from "./pages/ReviewsPage";
import StoreDetailPage from "./pages/StoreDetailPage";
import StoresPage from "./pages/StoresPage";
import SupportChatPage from "./pages/SupportChatPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";

export default function App() {
  return (
    <BrowserRouter>
      <SessionSecurityOverlay />
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route
              index
              element={
                <RouteErrorBoundary>
                  <AdminHomePage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="reports"
              element={
                <RouteErrorBoundary>
                  <ReportsPage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="operations/:storeKey"
              element={
                <RouteErrorBoundary>
                  <OperationDetailPage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="news/preview/:newsId"
              element={
                <RouteErrorBoundary>
                  <AdminNewsPreviewPage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="store"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="stores" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="menu"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="dishes" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="category"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="categories" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="user"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="users" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="news"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="news" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="events"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="events" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="store-dishes"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="storeDishes" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="orders"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="orders" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="reviews"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="reviews" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="feedbacks"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="feedbacks" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="workspace"
              element={
                <RouteErrorBoundary>
                  <AdminPage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="orders/:orderId"
              element={
                <RouteErrorBoundary>
                  <AdminPage forcedSection="orders" />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="workspace/orders/:orderId"
              element={
                <RouteErrorBoundary>
                  <AdminPage />
                </RouteErrorBoundary>
              }
            />
            <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
              <Route
                path="membership"
                element={
                  <RouteErrorBoundary>
                    <MembershipPage />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="promotion"
                element={
                  <RouteErrorBoundary>
                    <AdminPage forcedSection="promotions" />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="user-levels"
                element={
                  <RouteErrorBoundary>
                    <AdminPage forcedSection="userLevels" />
                  </RouteErrorBoundary>
                }
              />
            </Route>
          </Route>
        <Route
            path="admin.html"
            element={<Navigate replace to="/admin" />}
          />
        </Route>

        <Route path="/" element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="stores/:storeKey" element={<StoreDetailPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="menu/:itemId" element={<DishDetailPage />} />
          <Route path="category" element={<Navigate replace to="/menu" />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:eventKey" element={<EventDetailPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="news/:newsKey" element={<NewsDetailPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="complete-profile" element={<GoogleCompleteProfilePage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          {/* <Route path="register" element={<RegisterPage />} /> */}
          <Route path="verify-otp" element={<VerifyOtpPage />} />
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="cart" element={<CartPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="account/*" element={<AccountPage />} />
            <Route path="ai-chat" element={<AIChatPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["USER", "ADMIN", "MANAGER"]} />}>
            <Route path="support-chat" element={<SupportChatPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="checkout/result" element={<CheckoutResultPage />} />
            <Route path="checkout/result/:orderId" element={<CheckoutResultPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderId" element={<OrdersPage />} />
            <Route path="payment/success" element={<PaymentStatusPage mode="success" />} />
            <Route path="payment/cancel" element={<PaymentStatusPage mode="cancel" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["STAFF", "SHIPPER"]} />}>
            <Route path="employee" element={<EmployeePage />} />
            <Route path="employee/orders/:orderId" element={<EmployeePage />} />
          </Route>

          <Route path="*" element={<HomePage />} />
        </Route>

        {/* Dev-only UI kit — not rendered in production builds */}
        {import.meta.env.DEV && (
          <Route path="dev/ui-kit" element={<UiKitPage />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
