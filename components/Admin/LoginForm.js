import { useRef, useState } from "react";
import { useRouter } from "next/router";
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { accessDeniedMessage, authUnavailableMessage, signInErrorMessage, signInToWorkspace, validateSignIn } from "../../utils/adminAuth";

const inputClassName = "block min-h-[3rem] w-full min-w-0 rounded-md border border-gray-500 bg-white-500 px-3 py-3 text-base text-black-600 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&[aria-invalid=true]]:border-primary";

export default function LoginForm({ unavailable = false, accessDenied = false }) {
  const router = useRouter();
  const formRef = useRef(null);
  const submittingRef = useRef(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState(unavailable ? authUnavailableMessage : accessDenied ? accessDeniedMessage : "");

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const nextErrors = validateSignIn(values);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) {
      formRef.current.elements.namedItem(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    submittingRef.current = true;
    setPending(true);
    try {
      const client = getSupabaseBrowserClient();
      if (!client) {
        setFormError(authUnavailableMessage);
        return;
      }
      const result = await signInToWorkspace(client, values);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setValues((current) => ({ ...current, password: "" }));
      await router.replace("/admin/dashboard");
    } catch (error) {
      setFormError(signInErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="admin-login-heading" className="w-full max-w-md rounded-lg border border-gray-100 bg-white-500 p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md bg-primary-light text-primary">
        <LockKeyhole className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 id="admin-login-heading" className="text-2xl font-medium leading-tight">Admin Sign-In</h1>
      <form ref={formRef} onSubmit={submit} noValidate aria-busy={pending} className="mt-7 space-y-5">
        <div>
          <label htmlFor="admin-email" className="mb-2 block text-sm font-medium">Email address</label>
          <input id="admin-email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={values.email} onChange={updateField} disabled={pending} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "admin-email-error" : undefined} className={inputClassName} />
          {errors.email && <p id="admin-email-error" role="alert" className="mt-2 text-sm text-primary">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="admin-password" className="mb-2 block text-sm font-medium">Password</label>
          <div className="relative">
            <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={values.password} onChange={updateField} disabled={pending} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "admin-password-error" : undefined} className={inputClassName + " pr-12"} />
            <button type="button" onClick={() => setShowPassword((current) => !current)} disabled={pending} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded text-black-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p id="admin-password-error" role="alert" className="mt-2 text-sm text-primary">{errors.password}</p>}
        </div>
        {formError && (
          <div role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-primary">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{formError}</p>
          </div>
        )}
        <button type="submit" disabled={pending} className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
          {pending ? <><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Signing in...</> : <>Sign In<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
        </button>
      </form>
    </section>
  );
}
