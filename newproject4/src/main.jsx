import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { SiteDataProvider } from "./context/SiteDataContext";
import { SupportChatProvider } from "./context/SupportChatContext";
import { ToastProvider } from "./context/ToastContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <SiteDataProvider>
          <SupportChatProvider>
            <App />
          </SupportChatProvider>
        </SiteDataProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);
