import { TableCell, TableHead } from "@/components/ui/table";

export function SerialNumberHead() {
  return (
    <TableHead className="w-14 text-center whitespace-nowrap">S/N</TableHead>
  );
}

export function SerialNumberCell({
  index,
  offset,
}: {
  index: number;
  offset: number;
}) {
  return (
    <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
      {offset + index + 1}
    </TableCell>
  );
}
