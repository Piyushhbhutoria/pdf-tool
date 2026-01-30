import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToolCard } from "@/components/ToolCard";
import { FileText, Merge, Scissors, ArrowUpDown, Minimize2 } from "lucide-react";

const Index = () => {
  const tools = [
    {
      icon: Merge,
      title: "Merge PDFs",
      description: "Combine multiple PDF files into a single document with ease",
      href: "/merge",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      icon: Scissors,
      title: "Split PDF",
      description: "Extract specific pages or split your PDF into multiple files",
      href: "/split",
      gradient: "from-indigo-500 to-indigo-600"
    },
    {
      icon: ArrowUpDown,
      title: "Rearrange Pages",
      description: "Reorganize pages in your PDF by dragging and dropping",
      href: "/rearrange",
      gradient: "from-violet-500 to-violet-600"
    },
    {
      icon: Minimize2,
      title: "Compress PDF",
      description: "Reduce file size while maintaining quality for easy sharing",
      href: "/compress",
      gradient: "from-purple-500 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-12 flex-1">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
            <FileText className="h-16 w-16 text-primary-foreground" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PDF Tools Suite
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional PDF manipulation tools at your fingertips. Merge, split, compress, and edit your documents effortlessly.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tools.map((tool) => (
            <ToolCard key={tool.title} {...tool} />
          ))}
        </div>

        {/* Features */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">100%</div>
              <p className="text-sm text-muted-foreground">Secure & Private</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">Fast</div>
              <p className="text-sm text-muted-foreground">Lightning Quick Processing</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">Free</div>
              <p className="text-sm text-muted-foreground">No Limits or Watermarks</p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
