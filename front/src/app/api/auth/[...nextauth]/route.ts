import nextAuth from "next-auth/next";
// import type { NextAuthOptions } from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
import { options } from "./options";

const handler = nextAuth(options);

export { handler as GET, handler as POST };
