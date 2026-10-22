import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-xs sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
          <div className="p-2 rounded-lg bg-linear-to-br from-primary to-accent">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            PDFTools
          </span>
        </Link>
      </div>
    </header>
  );
};
