import type { ReactNode } from "react";
import { BatteryMedium, Signal, Wifi } from "lucide-react";
import styles from "./phone-frame.module.css";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.device}>
      <div className={styles.screen}>
        <div className={styles.system} aria-hidden="true">
          <span>09:41</span>
          <i />
          <div><Signal /><Wifi /><BatteryMedium /></div>
        </div>
        <div className={styles.content}>{children}</div>
        <div className={styles.home} aria-hidden="true" />
      </div>
    </div>
  );
}
