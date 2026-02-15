import { authApiHandler } from "@neondatabase/auth/next/server";

export const { GET, POST, PUT, DELETE, PATCH } = authApiHandler();
