'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const NAV_ITEMS = [
  { href: '/', icon: '🏠', label: 'Inicio' },
  { href: '/encuesta/nueva', icon: '📋', label: 'Encuesta' },
  { href: '/fincas', icon: '🌿', label: 'Fincas' },
  { href: '/exportar', icon: '📦', label: 'Exportar' },
  { href: '/perfil', icon: '👤', label: 'Perfil' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isOnline = useOnlineStatus();

  return (
    <>
      <div className={`status-bar ${isOnline ? 'status-bar--online' : 'status-bar--offline'}`} />
      <nav className="nav-bottom" id="main-navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase()}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
