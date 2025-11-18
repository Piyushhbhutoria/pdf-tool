import { Button } from "@/components/ui/button";
import { MousePointer, Square, Trash2, Undo, Redo, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Tool = "select" | "redact";

interface RedactionToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  redactionCount: number;
}

export const RedactionToolbar = ({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onDelete,
  canUndo,
  canRedo,
  redactionCount,
}: RedactionToolbarProps) => {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Draw black boxes over sensitive information. Redactions are permanent once saved.
        </AlertDescription>
      </Alert>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tools */}
          <div className="flex gap-1">
            <Button
              variant={activeTool === "select" ? "default" : "outline"}
              size="icon"
              onClick={() => onToolChange("select")}
              title="Select and move redactions"
            >
              <MousePointer className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === "redact" ? "default" : "outline"}
              size="icon"
              onClick={() => onToolChange("redact")}
              title="Draw redaction box"
            >
              <Square className="h-4 w-4" />
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
              title="Delete selected redaction"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Status */}
          <div className="text-sm text-muted-foreground">
            {redactionCount} redaction{redactionCount !== 1 ? "s" : ""} on this page
          </div>
        </div>
      </Card>
    </div>
  );
};
