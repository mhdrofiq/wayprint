import AboutPanel from '@/components/AboutPanel';
import LastUpdated from '@/components/LastUpdated';
import { layers } from '@/lib/layers';

/** About pill + "Updated …" badge in the top-left corner, shifted right by
 *  whatever the admin UI occupies (`--admin-panel-w`, set by AdminSheet). */
export default function TopLeftBar() {
  return (
    <div
      className="fixed top-4 flex items-start gap-2 transition-[left] duration-300"
      style={{ zIndex: layers.ADMIN_SHEET - 5, left: 'calc(1rem + var(--admin-panel-w, 0px))' }}
    >
      <AboutPanel />
      <div className="max-sm:peer-data-[state=open]:hidden">
        <LastUpdated />
      </div>
    </div>
  );
}
