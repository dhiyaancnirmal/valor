import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { LoginPage } from "@/components/LoginPage"

export const metadata: Metadata = {
  title: "Valor Login",
  description: "Authenticate with World App wallet to use Valor.",
}

export default async function Login({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()

  if (session?.user?.walletAddress) {
    redirect(`/${locale}`)
  }

  return <LoginPage />
}
