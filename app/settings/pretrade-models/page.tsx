import { Header } from "@/components/header";
import { PretradeModelManager } from "@/components/settings/pretrade-model-manager";

export default function PretradeModelsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <PretradeModelManager />
      </main>
    </div>
  );
}