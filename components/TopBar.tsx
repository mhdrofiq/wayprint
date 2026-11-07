import AboutPanel from '@/components/AboutPanel';
import LastUpdated from '@/components/LastUpdated';
import { layers, TOP_BAR_SLOT_ID } from '@/lib/layers';

/** One-line status bar across the top of the screen: name, About, last update
 *  and the pin list toggle. On desktop its left edge moves right
 *  by whatever the admin UI occupies (`--admin-panel-w`, set by AdminSheet). */
export default function TopBar() {
  return (
    <header
      className="fixed top-0 right-0 flex items-stretch bg-tui-panel text-tui-fg border-b border-tui-line text-xs whitespace-nowrap transition-[left] duration-300"
      style={{
        zIndex: layers.ADMIN_SHEET - 5,
        left: 'var(--admin-panel-w, 0px)',
        height: 'calc(var(--tui-top-h) + var(--sat))',
        paddingTop: 'var(--sat)',
      }}
    >
      <div className="flex items-center px-2.5 bg-tui-accent text-tui-accent-fg font-extrabold tracking-[0.08em] select-none">
        WAYPRINT
      </div>
      <AboutPanel />
      <LastUpdated />
      <div className="flex-1" />
      <div id={TOP_BAR_SLOT_ID} className="flex items-stretch" />
    </header>
  );
}
