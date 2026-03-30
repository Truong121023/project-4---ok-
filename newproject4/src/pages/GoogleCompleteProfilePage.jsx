import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { isProfileCompleted, resolvePostAuthPath } from "../lib/authRedirects";
import { ui } from "../ui";

const initialForm = {
  fullName: "",
  password: "",
  confirmPassword: "",
};

export default function GoogleCompleteProfilePage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    fullName: auth.user?.fullName ?? "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const redirectTo = location.state?.from?.pathname ?? "";
  useToastMessage(error, {
    type: "error",
    title: "Hoan tat tai khoan that bai",
  });
  useToastMessage(notice, {
    type: "success",
    title: "Thong bao",
  });

  if (auth.initializing) {
    return (
      <main className={ui.page}>
        <section className={`${ui.panel} text-center`}>
          <p className={ui.eyebrow}>Google profile</p>
          <h1 className="text-3xl font-bold tracking-tight text-tea-900">
            Restoring your session
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
            Please wait a moment...
          </p>
        </section>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location.state?.from ?? null }} to="/login" />;
  }

  if (isProfileCompleted(auth.user)) {
    return <Navigate replace to={resolvePostAuthPath(auth.user, redirectTo)} />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    if (!form.fullName.trim()) {
      setError("Vui long nhap ho ten de hoan tat tai khoan.");
      setLoading(false);
      return;
    }

    if (!form.password.trim()) {
      setError("Vui long tao mat khau cho tai khoan Tea Matcha.");
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Mat khau xac nhan khong khop.");
      setLoading(false);
      return;
    }

    try {
      const response = await auth.completeGoogleProfile({
        fullName: form.fullName.trim(),
        password: form.password,
      });

      setNotice(response?.message ?? "Ho so da duoc cap nhat.");
      navigate(resolvePostAuthPath(response.user, redirectTo), { replace: true });
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Khong the hoan tat ho so Google."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={ui.page}>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={`${ui.panel} flex flex-col gap-5`}>
          <div>
            <p className={ui.eyebrow}>Tea Matcha</p>
            <h1 className={ui.bannerTitle}>Hoan tat tai khoan Tea Matcha cua ban</h1>
            <p className={ui.copy}>
              Ban da dang nhap bang Google thanh cong. Chi can bo sung ho ten va mat khau de tai
              khoan Tea Matcha hoan tat va vao he thong ngay.
            </p>
          </div>

          <article className={`${ui.card} grid gap-4`}>
            <div>
              <p className={ui.eyebrow}>Google account</p>
              <h2 className="text-xl font-semibold text-tea-900">{auth.user?.email}</h2>
            </div>

            <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 px-5 py-4 text-sm leading-7 text-stone-600">
              Tai khoan nay da co session dang nhap. Sau khi hoan tat thong tin, frontend se dung
              luon token hien tai, khong can dang nhap lai.
            </div>
          </article>
        </div>

        <form className={`${ui.panel} grid gap-5`} onSubmit={handleSubmit}>
          <div>
            <p className={ui.eyebrow}>Finish setup</p>
            <p className="text-3xl font-bold tracking-tight text-tea-900">Bo sung thong tin</p>
            <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
              Ho ten se hien trong ho so va don hang. Mat khau nay dung cho dang nhap Tea Matcha
              thong thuong sau nay neu ban can.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Email Google</span>
            <input className={ui.input} type="email" value={auth.user?.email ?? ""} disabled />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Ho ten</span>
            <input
              className={ui.input}
              name="fullName"
              placeholder="Nguyen Van A"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Mat khau</span>
            <input
              className={ui.input}
              type="password"
              name="password"
              placeholder="Tao mat khau cho Tea Matcha"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Xac nhan mat khau</span>
            <input
              className={ui.input}
              type="password"
              name="confirmPassword"
              placeholder="Nhap lai mat khau"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          {notice ? (
            <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button className={ui.primaryButton} type="submit" disabled={loading}>
            {loading ? "Dang cap nhat..." : "Hoan tat tai khoan"}
          </button>

          <div className="flex flex-wrap gap-3 text-sm text-stone-600">
            <Link className="font-semibold text-matcha-700" to="/">
              Ve trang chu
            </Link>
            <button className="font-semibold text-matcha-700" type="button" onClick={() => auth.logout()}>
              Dang xuat
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
