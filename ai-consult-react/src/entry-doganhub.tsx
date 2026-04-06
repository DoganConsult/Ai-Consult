import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import DoganHubApp from "./DoganHubApp";
import { ScrollToTop } from "./components/shared/ScrollToTop";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <Router>
    <ScrollToTop />
    <DoganHubApp />
  </Router>
);
