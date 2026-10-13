import { COPY } from "@/config/copy";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold">{COPY.appName}</h1>
    </main>
  );
}
