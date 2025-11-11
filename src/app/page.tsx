import { auth } from "@/auth"
import { LoginPage } from "@/components/LoginPage"
import { MainUI } from "@/components/NewUI"

export default async function Home() {
  const session = await auth()

  if (!session?.user?.walletAddress) {
    return <LoginPage />
  }

  return <MainUI />
}
