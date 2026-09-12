import { forgotPasswordAction } from '../actions';

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Reset your password</h1>
      <form action={forgotPasswordAction} className="flex flex-col gap-4">
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <button type="submit" className="rounded bg-slate-900 p-2 text-white">
          Send reset link
        </button>
      </form>
    </div>
  );
}
