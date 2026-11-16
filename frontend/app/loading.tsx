export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Yuklanmoqda">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/15 border-t-primary" />
    </div>
  );
}
