/**
 * The admin surface, isolated from the personas.
 *
 * Everything under `(persona)` is themed by `data-persona` on `<html>`, which
 * sets the body background, the foreground colour and three typefaces. The
 * admin route is not a persona — it is a form — but it renders inside the same
 * root layout, so it inherited a dark ground under DOTM and Cinzel Decorative
 * on its section headings.
 *
 * `.admin-surface` is the hook `globals.css` uses to switch all of that off for
 * this route only. The class has to sit on an element inside `<body>` rather
 * than on `<html>`: a nested layout cannot touch the document element, and the
 * body background is the thing that was showing through below the fold.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-surface">{children}</div>;
}
