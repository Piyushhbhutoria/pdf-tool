import { Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm py-6">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> by{" "}
          <a
            href="https://piyushhbhutoria.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Piyushh
          </a>
        </span>
      </div>
    </footer>
  );
};
