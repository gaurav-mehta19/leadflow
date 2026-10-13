import { AppHeader } from "@/components/common/app-header";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function HomePage() {
  return <AppHeader actions={<ThemeToggle />} />;
}
