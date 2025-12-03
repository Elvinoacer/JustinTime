
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

console.log("NextAuth type:", typeof NextAuth);
console.log("NextAuth export:", NextAuth);

try {
  const result = NextAuth({
    providers: [],
    secret: "test-secret"
  });
  console.log("NextAuth({}) result keys:", Object.keys(result));
} catch (e) {
  console.error("NextAuth threw:", e);
}
