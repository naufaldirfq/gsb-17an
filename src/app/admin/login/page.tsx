import { LoginForm } from "./login-form";

export default async function LoginPage() {

  return (
    <div className="min-h-screen bg-putih-kertas flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-merah mb-6 text-center">Admin Login</h1>
        <LoginForm />
      </div>
    </div>
  );
}
