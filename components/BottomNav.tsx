'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Moon, Heart, UserCircle } from 'lucide-react';

const TABS = [
  { href: '/discover',     Icon: BookOpen,   label: 'Stories'   },
  { href: '/sleep',        Icon: Moon,       label: 'Sleep'     },
  { href: '/memories',     Icon: Heart,      label: 'Memories'  },
  { href: '/profile/view', Icon: UserCircle, label: 'Profile'   },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] frosted-nav flex z-50 shadow-nav rounded-t-3xl">
      {TABS.map(({ href, Icon, label }) => {
        const isActive =
          pathname === href ||
          pathname.startsWith(href + '/') ||
          (href === '/discover' && (pathname === '/' || pathname.startsWith('/my-stories') || pathname.startsWith('/play'))) ||
          (href === '/sleep' && pathname.startsWith('/songs'));

        return (
          <Link key={href} href={href} className="flex-1 flex flex-col items-center pt-3 pb-5 gap-0.5 relative">
            <motion.div
              whileTap={{ scale: 0.78 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className={`p-2.5 rounded-2xl transition-all duration-200 ${isActive ? 'bg-coral/10' : ''}`}
            >
              <Icon
                size={23}
                strokeWidth={isActive ? 2.5 : 1.7}
                className={`transition-colors duration-200 ${isActive ? 'text-coral' : 'text-gray-400'}`}
              />
            </motion.div>

            <span className={`font-nunito text-[11px] font-bold transition-colors duration-200 ${isActive ? 'text-coral' : 'text-gray-400'}`}>
              {label}
            </span>

            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className="absolute bottom-2 w-8 h-[3px] bg-coral rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
