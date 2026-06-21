import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "../actions";

export default async function AdminGuardedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authCookie = (await cookies()).get("admin_auth");
  if (authCookie?.value !== "true") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-putih-kertas text-arang">
      <header className="bg-merah text-putih-kertas p-4 shadow-md flex justify-between items-center">
        <div className="font-bold text-xl flex items-center gap-2">
          <Link href="/admin" className="hover:text-emas transition-colors">GSB Admin Panel</Link>
        </div>
        <nav className="flex gap-6 items-center font-medium">
          <Link href="/admin" className="hover:text-emas transition-colors">Dashboard</Link>
          <Link href="/admin/peserta" className="hover:text-emas transition-colors">Peserta</Link>
          <form action={logoutAction}>
            <button className="bg-merah-tua hover:bg-black/20 text-putih-kertas px-4 py-2 rounded-md transition-colors text-sm font-semibold">
              Logout
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
