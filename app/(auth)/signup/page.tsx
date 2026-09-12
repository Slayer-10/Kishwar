import { signUpAction } from '../actions';

export default function SignupPage() {
  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Create your KISHWAR account</h1>
      <form action={signUpAction} className="flex flex-col gap-4">
        <input name="fullName" type="text" placeholder="Full name" required className="rounded border p-2" />
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="rounded border p-2"
        />
        <button type="submit" className="rounded bg-slate-900 p-2 text-white">
          Sign up
        </button>
      </form>
      <div className="mt-4 text-sm">
        <a href="/login" className="text-slate-600 underline">Already have an account? Log in</a>
      </div>
    </div>
  );
}
