import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface ToolPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export const ToolPageShell = ({
  title,
  description,
  children,
}: ToolPageShellProps) => (
  <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
    <Header />

    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tools
      </Link>

      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </main>
  </div>
);
