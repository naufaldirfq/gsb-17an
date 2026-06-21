"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_AUTH_COOKIE } from "@/lib/constants";

export async function loginAction(prevState: unknown, formData: FormData) {
  const password = formData.get("password");
  if (password === "admin123") {
    (await cookies()).set(ADMIN_AUTH_COOKIE, "true", { path: "/" });
    redirect("/admin");
  }
  return { error: "Invalid password" };
}

export async function logoutAction() {
  (await cookies()).delete(ADMIN_AUTH_COOKIE);
  redirect("/admin/login");
}
