import { resetPasswordAction } from '../actions';

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Set a new password</h1>
      <form action={resetPasswordAction} className="flex flex-col gap-4">
        <input
          name="password"
          type="password"
          placeholder="New password"
          required
          minLength={6}
          className="rounded border p-2"
        />
        <button type="submit" className="rounded bg-slate-900 p-2 text-white">
          Update password
        </button>
      </form>
    </div>
  );
}
