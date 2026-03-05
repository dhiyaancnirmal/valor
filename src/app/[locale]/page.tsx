import type { Metadata } from "next"
import { auth } from "@/auth"
import { LoginPage } from "@/components/LoginPage"
import { MainUI } from "@/components/NewUI"

export const metadata: Metadata = {
  title: "Valor App",
  description: "Submit gas prices and improve local price visibility in the World mini app.",
}

export default async function Home() {
  const session = await auth()

  if (!session?.user?.walletAddress) {
    return <LoginPage />
  }

  return <MainUI />
}
