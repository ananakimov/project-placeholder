import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "Бухгалтер" | "Аспирант";
const Ctx = createContext<{ role: Role; setRole: (r: Role) => void }>({
  role: "Бухгалтер",
  setRole: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Бухгалтер");
  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
}
export const useRole = () => useContext(Ctx);
