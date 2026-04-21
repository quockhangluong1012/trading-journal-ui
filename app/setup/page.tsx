import { Header } from "@/components/header"
import { SetupManager } from "@/components/settings/setup-manager"

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="w-full px-4 py-8 sm:px-6 xl:px-8 2xl:px-10">
        <SetupManager />
      </main>
    </div>
  )
}