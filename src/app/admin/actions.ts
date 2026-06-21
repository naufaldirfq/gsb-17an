"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(prevState: unknown, formData: FormData) {
  const password = formData.get("password");
  if (password === "admin123") {
    (await cookies()).set("admin_auth", "true", { path: "/" });
    redirect("/admin");
  }
  return { error: "Invalid password" };
}

export async function logoutAction() {
  (await cookies()).delete("admin_auth");
  redirect("/admin/login");
}
