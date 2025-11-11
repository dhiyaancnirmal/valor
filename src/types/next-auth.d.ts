import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    walletAddress?: string
    username?: string
    profilePictureUrl?: string
  }

  interface Session {
    user: {
      walletAddress?: string
      username?: string
      profilePictureUrl?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    walletAddress?: string
    username?: string
    profilePictureUrl?: string
  }
}
