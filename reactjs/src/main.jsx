import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppRealtimeProvider } from "./context/AppRealtimeContext";
import { AuthProvider } from "./context/AuthContext";
import { SiteDataProvider } from "./context/SiteDataContext";
import { SupportChatProvider } from "./context/SupportChatContext";
import { ToastProvider } from "./context/ToastContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <AppRealtimeProvider>
          <SiteDataProvider>
            <SupportChatProvider>
              <App />
            </SupportChatProvider>
          </SiteDataProvider>
        </AppRealtimeProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);
