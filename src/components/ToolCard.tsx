import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  gradient?: string;
}

export const ToolCard = ({ icon: Icon, title, description, href, gradient = "from-primary to-accent" }: ToolCardProps) => {
  return (
    <Link to={href}>
      <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 hover:border-primary/50">
        <CardContent className="p-6">
          <div className={`inline-flex p-3 rounded-xl bg-linear-to-br ${gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};
