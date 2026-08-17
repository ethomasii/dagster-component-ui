import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CatalogProvider } from "./context/CatalogContext";
import { Home } from "./pages/Home";
import { ExamplesIndex } from "./pages/ExamplesIndex";
import { ExampleDetail } from "./pages/ExampleDetail";
import { VendorsIndex } from "./pages/VendorsIndex";
import { VendorDetail } from "./pages/VendorDetail";
import { ComponentDetail } from "./pages/ComponentDetail";
import { GetStartedPage } from "./pages/GetStartedPage";
import { AiAssistantsPage } from "./pages/AiAssistantsPage";
import { DeployDagsterPlusPage } from "./pages/DeployDagsterPlusPage";
import { BlogIndex } from "./pages/BlogIndex";
import { BlogDetail } from "./pages/BlogDetail";
import { UnifiedSearch } from "./pages/UnifiedSearch";

export default function App() {
  return (
    <CatalogProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/get-started" element={<GetStartedPage />} />
          <Route path="/ai-assistants" element={<AiAssistantsPage />} />
          <Route path="/dagster-plus" element={<DeployDagsterPlusPage />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
          <Route path="/examples" element={<ExamplesIndex />} />
          <Route path="/examples/:slug" element={<ExampleDetail />} />
          <Route path="/vendors" element={<VendorsIndex />} />
          <Route path="/vendors/:slug" element={<VendorDetail />} />
          <Route path="/c/:id" element={<ComponentDetail />} />
          <Route path="/search" element={<UnifiedSearch />} />
        </Routes>
      </Layout>
    </CatalogProvider>
  );
}
