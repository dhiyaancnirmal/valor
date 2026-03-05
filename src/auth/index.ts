import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { verifySignature } from "./wallet/verify"
import { cookies } from "next/headers"

const authSecret =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV !== "production" ? "valor-dev-auth-secret" : undefined)

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  providers: [
    Credentials({
      id: "worldcoin",
      name: "Worldcoin",
      credentials: {
        walletAddress: { label: "Wallet Address", type: "text" },
        signature: { label: "Signature", type: "text" },
        message: { label: "Message", type: "text" },
        nonce: { label: "Nonce", type: "text" },
        requestId: { label: "Request ID", type: "text" },
        version: { label: "Version", type: "text" },
        statement: { label: "Statement", type: "text" },
        username: { label: "Username", type: "text" },
        profilePictureUrl: { label: "Profile Picture URL", type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.walletAddress ||
          !credentials?.signature ||
          !credentials?.message ||
          !credentials?.nonce
        ) {
          return null
        }

        const cookieStore = await cookies()
        const storedNonce = cookieStore.get("siwe")?.value
        if (!storedNonce || storedNonce !== credentials.nonce) {
          return null
        }

        const isValid = await verifySignature(
          credentials.message as string,
          credentials.signature as string,
          credentials.walletAddress as string,
          credentials.nonce as string,
          credentials.statement as string | undefined,
          credentials.requestId as string | undefined,
          credentials.version as string | undefined
        )

        if (!isValid) {
          return null
        }

        return {
          id: credentials.walletAddress as string,
          walletAddress: credentials.walletAddress as string,
          username: credentials.username as string || undefined,
          profilePictureUrl: credentials.profilePictureUrl as string || undefined,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.walletAddress = user.walletAddress
        token.username = user.username
        token.profilePictureUrl = user.profilePictureUrl
      }
      return token
    },
    async session({ session, token }) {
      if (token.walletAddress) {
        session.user.walletAddress = token.walletAddress as string
      }
      if (token.username) {
        session.user.username = token.username as string
      }
      if (token.profilePictureUrl) {
        session.user.profilePictureUrl = token.profilePictureUrl as string
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
})
