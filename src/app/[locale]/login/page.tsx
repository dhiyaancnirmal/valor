import type { Metadata } from "next"
import { LoginPage } from "@/components/LoginPage"

export const metadata: Metadata = {
  title: "Valor Login",
  description: "Authenticate with World App wallet to use Valor.",
}

export default function Login() {
  return <LoginPage />
}

