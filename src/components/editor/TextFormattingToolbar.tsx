import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bold, Italic, Underline } from "lucide-react";

interface TextFormattingToolbarProps {
  fontSize: number;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  onFontSizeChange: (size: number) => void;
  onFontFamilyChange: (family: string) => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
}

const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];
const fontFamilies = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Comic Sans MS",
  "Impact",
];

export const TextFormattingToolbar = ({
  fontSize,
  fontFamily,
  isBold,
  isItalic,
  isUnderline,
  onFontSizeChange,
  onFontFamilyChange,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
}: TextFormattingToolbarProps) => {
  return (
    <Card className="p-3 border-primary/20 bg-primary/5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Font:</span>
          <Select value={fontFamily} onValueChange={onFontFamilyChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Size:</span>
          <Select value={fontSize.toString()} onValueChange={(val) => onFontSizeChange(parseInt(val))}>
            <SelectTrigger className="w-[80px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex gap-1">
          <Button
            variant={isBold ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={onToggleBold}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={isItalic ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={onToggleItalic}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={isUnderline ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={onToggleUnderline}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
