export default function Footer() {
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="container-page flex flex-col gap-2 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-lg font-extrabold">Homeward</p>
        <p className="text-paper/75">A student project built with React, Express and MongoDB.</p>
      </div>
    </footer>
  );
}
