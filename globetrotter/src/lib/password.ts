import bcrypt from "bcryptjs"

// Node runtime only. Never import this from middleware.
const ROUNDS = 10

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS)

export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash)
