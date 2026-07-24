export default function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="shadow-sm">
      <div className="pt-4">{children}</div>
    </div>
  );
}
