// Admin has its own full-screen layout — no navbar, no shared shell
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
