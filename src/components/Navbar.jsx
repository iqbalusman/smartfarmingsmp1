// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Leaf, Activity, Phone, Home, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const location = useLocation();

  // merah hanya di /irigasitetes (atau /monitoring/irigasitetes) & /berandairigasi
  const isIrigasiTheme =
    /^\/(monitoring\/)?irigasitetes(\/|$)/.test(location.pathname) ||
    location.pathname === '/berandairigasi';

  const navItems = [
    { path: '/', label: 'Beranda', icon: Home },
    {
      label: 'Monitoring',
      icon: Activity,
      children: [
        { path: '/hidroponik', label: 'Hidroponik' },
        { path: '/irigasitetes', label: 'Irigasi Tetes' },
      ],
    },
    { path: '/tentang', label: 'Tentang', icon: Info },
    { path: '/contact', label: 'Kontak', icon: Phone },
  ];

  const isActive = (p) => location.pathname === p;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b glass-effect ${isIrigasiTheme ? 'border-red-200/20 bg-red-50/70' : 'border-green-200/20 bg-white/70'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <motion.div className={`p-2 rounded-lg ${isIrigasiTheme ? 'bg-red-500' : 'bg-green-500'}`}>
              <img  
                alt="Sistem hidroponik IoT dengan sensor dan monitoring"
                className="w-8 h-8"
                src="/logo.png" />
            </motion.div>
            <span className={`text-xl font-bold ${isIrigasiTheme ? 'text-red-700' : 'text-green-700'}`}>SmartFarming</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.children) {
                const open = dropdownOpen === item.label;
                const anyChildActive = item.children.some((c) => isActive(c.path));
                const activeStyle = open || anyChildActive
                  ? `${isIrigasiTheme ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} shadow-lg`
                  : `${isIrigasiTheme ? 'text-red-700 hover:bg-red-100' : 'text-green-700 hover:bg-green-100'}`;

                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => setDropdownOpen(item.label)}
                    onMouseLeave={() => setDropdownOpen(null)}
                  >
                    <button className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${activeStyle}`}>
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-lg overflow-hidden z-50"
                        >
                          {item.children.map((child) => (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={`block px-4 py-2 text-sm hover:${isIrigasiTheme ? 'bg-red-100' : 'bg-green-100'} ${
                                isActive(child.path) ? (isIrigasiTheme ? 'bg-red-200 font-bold' : 'bg-green-200 font-bold') : ''
                              }`}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive(item.path)
                      ? `${isIrigasiTheme ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} shadow-lg`
                      : `${isIrigasiTheme ? 'text-red-700 hover:bg-red-100' : 'text-green-700 hover:bg-green-100'}`
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className={isIrigasiTheme ? 'text-red-700' : 'text-green-700'}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                if (item.children) {
                  const open = dropdownOpen === item.label;
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => setDropdownOpen(open ? null : item.label)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg w-full ${isIrigasiTheme ? 'text-red-700 hover:bg-red-100' : 'text-green-700 hover:bg-green-100'}`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {open && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.children.map((sub) => (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              onClick={() => { setIsOpen(false); setDropdownOpen(null); }}
                              className={`block px-3 py-1 rounded-md text-sm ${
                                isActive(sub.path)
                                  ? `${isIrigasiTheme ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`
                                  : `${isIrigasiTheme ? 'text-red-700 hover:bg-red-100' : 'text-green-700 hover:bg-green-100'}`
                              }`}
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? `${isIrigasiTheme ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} shadow-lg`
                        : `${isIrigasiTheme ? 'text-red-700 hover:bg-red-100' : 'text-green-700 hover:bg-green-100'}`
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
