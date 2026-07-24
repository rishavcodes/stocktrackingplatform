export default function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 max-w-7xl mx-auto">
      {children}
    </div>
  );
}
