export type CheckSearch = { version?: number; run?: string };

export function isDemoRun(id: unknown): id is `demo-${string}` {
  return typeof id === "string" && /^demo-[a-z0-9-]{6,64}$/i.test(id);
}

export function checkLocation(id: string, version?: number) {
  const isRun = isDemoRun(id);
  const search: CheckSearch = {
    ...(version === undefined ? {} : { version }),
    ...(isRun ? { run: id } : {}),
  };
  return { params: { id: isRun ? "g" : id }, search };
}
