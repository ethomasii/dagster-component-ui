import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeContext";
import App from "./App";
import "./index.css";

const rawBase = import.meta.env.BASE_URL;
const basename =
  rawBase === "/" ? undefined : rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter
        basename={basename}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
