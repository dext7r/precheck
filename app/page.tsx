import { redirect } from "next/navigation"
import { defaultLocale } from "@/lib/i18n/config"

export default function RootPage() {
  redirect(`/${defaultLocale}`)
}

// function HomePage() {
//   return (
//     <div className="flex min-h-screen flex-col">
//       <Header />
//       <main className="flex-1">
//         <HeroSection />
//         <FeaturesSection />
//         <TechStackSection />
//         <DeploySection />
//       </main>
//       <Footer />
//     </div>
//   )
// }
