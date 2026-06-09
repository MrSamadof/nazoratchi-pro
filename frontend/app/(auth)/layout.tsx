export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <main className="min-h-screen bg-background">{children}</main>;
}
