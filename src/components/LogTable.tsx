import { useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { actorType, type ActorType } from "@/lib/log-time";
import type { LogEntry } from "@/data/mock";

export type LogItem = LogEntry & { checkTitle?: string };
export function LogTable({ items, showCheck }: { items: LogItem[]; showCheck?: boolean }) {
  const [filter, setFilter] = useState<"all" | ActorType>("all");
  const list = items.filter((entry) => filter === "all" || actorType(entry.actor) === filter);
  const heads = [
    "Пользователь",
    "Действие",
    "Объект",
    ...(showCheck ? ["Проверка"] : []),
    "Было",
    "Стало",
  ];
  return (
    <div className="audit-log">
      <ToggleGroup
        aria-label="Тип записи"
        type="single"
        value={filter}
        onValueChange={(value) => value && setFilter(value as typeof filter)}
        className="audit-log-filters justify-start"
      >
        <ToggleGroupItem value="all">Все</ToggleGroupItem>
        <ToggleGroupItem value="system">Система</ToggleGroupItem>
        <ToggleGroupItem value="human">Человек</ToggleGroupItem>
        <ToggleGroupItem value="ai">ИИ-подсказка</ToggleGroupItem>
      </ToggleGroup>
      <Table className="audit-log-table">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {heads.map((head) => (
              <TableHead key={head}>{head}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((entry, index) => {
            const kind = actorType(entry.actor);
            return (
              <TableRow key={`${entry.at}-${index}`} className="hover:bg-transparent">
                <TableCell>
                  <div className="audit-person">
                    <span className="audit-avatar" data-actor={kind} aria-hidden="true">
                      {kind === "system" ? (
                        <Bot size={21} />
                      ) : kind === "ai" ? (
                        <Sparkles size={20} />
                      ) : (
                        entry.actor.trim()[0]
                      )}
                    </span>
                    <div>
                      <strong>{entry.actor}</strong>
                      <time>{entry.at}</time>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell>{entry.object}</TableCell>
                {showCheck && (
                  <TableCell className="audit-check-name">{entry.checkTitle}</TableCell>
                )}
                <TableCell className="old-value tabular-nums">{entry.before ?? "—"}</TableCell>
                <TableCell className="new-value tabular-nums">{entry.after ?? "—"}</TableCell>
              </TableRow>
            );
          })}
          {!list.length && (
            <TableRow>
              <TableCell colSpan={heads.length} className="py-10 text-center text-muted-foreground">
                Записей нет
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
