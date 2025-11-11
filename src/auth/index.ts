import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { verifySignature } from "./wallet/verify"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "worldcoin",
      name: "Worldcoin",
      credentials: {
        walletAddress: { label: "Wallet Address", type: "text" },
        signature: { label: "Signature", type: "text" },
        message: { label: "Message", type: "text" },
      },
      async authorize(credentials) {
        console.log("NextAuth authorize called with:", {
          walletAddress: credentials?.walletAddress,
          hasSignature: !!credentials?.signature,
          hasMessage: !!credentials?.message,
        })

        if (!credentials?.walletAddress || !credentials?.signature || !credentials?.message) {
          console.error("Missing credentials:", {
            walletAddress: !!credentials?.walletAddress,
            signature: !!credentials?.signature,
            message: !!credentials?.message,
          })
          return null
        }

        const isValid = await verifySignature(
          credentials.message as string,
          credentials.signature as string,
          credentials.walletAddress as string
        )

        if (!isValid) {
          console.error("Signature verification failed")
          return null
        }

        console.log("Authorization successful for wallet:", credentials.walletAddress)

        return {
          id: credentials.walletAddress as string,
          walletAddress: credentials.walletAddress as string,
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
      }
      return token
    },
    async session({ session, token }) {
      if (token.walletAddress) {
        session.user.walletAddress = token.walletAddress as string
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
})
