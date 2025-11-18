import { Button } from "@/components/ui/button";
import { 
  MousePointer, 
  Type, 
  Pencil, 
  Square, 
  Circle, 
  Image as ImageIcon,
  Minus,
  Trash2,
  Undo,
  Redo
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Tool = "select" | "text" | "draw" | "rectangle" | "circle" | "line" | "image";

interface EditorToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  activeColor: string;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onImageUpload: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const colors = [
  "#000000", "#ffffff", "#ef4444", "#3b82f6", "#22c55e", 
  "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4"
];

export const EditorToolbar = ({
  activeTool,
  onToolChange,
  onColorChange,
  activeColor,
  onUndo,
  onRedo,
  onDelete,
  onImageUpload,
  canUndo,
  canRedo,
}: EditorToolbarProps) => {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Tools */}
        <div className="flex gap-1">
          <Button
            variant={activeTool === "select" ? "default" : "outline"}
            size="icon"
            onClick={() => onToolChange("select")}
            title="Select"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "text" ? "default" : "outline"}
            size="icon"
            onClick={() => onToolChange("text")}
            title="Add Text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "draw" ? "default" : "outline"}
            size="icon"
            onClick={() => onToolChange("draw")}
            title="Free Draw"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Shapes */}
        <div className="flex gap-1">
          <Button
            variant={activeTool === "rectangle" ? "default" : "outline"}
            size="icon"
            onClick={() => onToolChange("rectangle")}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "circle" ? "default" : "outline"}
            size="icon"
            onClick={() => onToolChange("circle")}
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "line" ? "default" : "outline"}
            size="icon"
            onClick={() => onToolChange("line")}
            title="Line"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "image" ? "default" : "outline"}
            size="icon"
            onClick={onImageUpload}
            title="Add Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Actions */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            title="Delete Selected"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Color Picker */}
        <div className="flex gap-1 items-center">
          <span className="text-sm font-medium text-muted-foreground mr-1">Color:</span>
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-8 h-8 rounded border-2 transition-all ${
                activeColor === color ? "border-primary scale-110" : "border-border"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};
