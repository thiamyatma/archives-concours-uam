import { Progress } from "@/components/ui/progress";

export function UploadProgress({ value }: { value: number }) {
  return (
    <div className="space-y-1.5">
      <Progress value={value} />
      <p className="text-muted-foreground text-right text-xs tabular-nums">{value}%</p>
    </div>
  );
}
