import { signInAction } from '../actions';

export default function LoginPage() {
  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Log in to KISHWAR</h1>
      <form action={signInAction} className="flex flex-col gap-4">
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input name="password" type="password" placeholder="Password" required className="rounded border p-2" />
        <button type="submit" className="rounded bg-slate-900 p-2 text-white">
          Log in
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <a href="/signup" className="text-slate-600 underline">Create account</a>
        <a href="/forgot-password" className="text-slate-600 underline">Forgot password?</a>
      </div>
    </div>
  );
}
