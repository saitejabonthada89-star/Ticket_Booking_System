import React from 'react';
import { 
  Ticket, 
  User as UserIcon, 
  Mail, 
  FileText, 
  Download, 
  Clock, 
  ShieldAlert, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Sparkles,
  QrCode,
  ScanLine
} from 'lucide-react';
import { User, SeatHold } from '../types';
import { AppStorage } from '../services/storage';
import { generateProjectZip } from '../services/exportZip';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onUserChange: (user: User) => void;
  users: User[];
  activeHold: SeatHold | null;
  onOpenCheckout: () => void;
  onReleaseHold: () => void;
  unreadEmailCount: number;
  onOpenEmailInbox: () => void;
  onOpenSystemDesign: () => void;
  onOpenGateScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onUserChange,
  users,
  activeHold,
  onOpenCheckout,
  onReleaseHold,
  unreadEmailCount,
  onOpenEmailInbox,
  onOpenSystemDesign,
  onOpenGateScanner,
}) => {
  const [holdTimeLeft, setHoldTimeLeft] = React.useState<string>('');
  const [isExporting, setIsExporting] = React.useState(false);

  // Live countdown for active hold
  React.useEffect(() => {
    if (!activeHold) {
      setHoldTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = activeHold.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setHoldTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setHoldTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold]);

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      await generateProjectZip();
    } catch (err) {
      console.error('Failed to export zip:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveTab('explore')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Ticket className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xl tracking-tight text-white">Omni<span className="text-indigo-400">Ticket</span></span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">Real-Time</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">High-Demand Seat Engine & Waitlist</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              id="nav-tab-explore"
              onClick={() => setActiveTab('explore')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'explore'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Browse Shows
            </button>

            <button
              id="nav-tab-bookings"
              onClick={() => setActiveTab('bookings')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'bookings'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              My Tickets
            </button>

            <button
              id="nav-tab-waitlists"
              onClick={() => setActiveTab('waitlists')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'waitlists'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Waitlist Offers
            </button>

            {(currentUser.role === 'organiser' || currentUser.role === 'admin') && (
              <button
                id="nav-tab-organiser"
                onClick={() => setActiveTab('organiser')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'organiser'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                Organiser Hub
              </button>
            )}

            {currentUser.role === 'admin' && (
              <button
                id="nav-tab-admin"
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Admin & Chaos
              </button>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            
            {/* Active Hold Countdown Badge */}
            {activeHold && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-medium animate-pulse">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Hold: {activeHold.seatIds.join(', ')}</span>
                <span className="font-mono font-bold text-amber-200">{holdTimeLeft}</span>
                <button
                  onClick={onOpenCheckout}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded text-[11px] transition-colors ml-1"
                >
                  Pay
                </button>
              </div>
            )}

            {/* Gate Scanner Button */}
            <button
              id="btn-gate-scanner"
              onClick={onOpenGateScanner}
              title="Gate Ticket QR Scanner"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <ScanLine className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline">Gate Scan</span>
            </button>

            {/* Simulated Email Inbox */}
            <button
              id="btn-email-inbox"
              onClick={onOpenEmailInbox}
              className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
              title="Simulated Email Inbox (QR Tickets & Waitlist Alerts)"
            >
              <Mail className="w-4 h-4 text-indigo-400" />
              {unreadEmailCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40 animate-bounce">
                  {unreadEmailCount}
                </span>
              )}
            </button>

            {/* System Design Doc */}
            <button
              id="btn-system-design"
              onClick={onOpenSystemDesign}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
              title="View 800-word System Design Write-up"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>System Design</span>
            </button>

            {/* Download Source Code ZIP */}
            <button
              id="btn-download-zip"
              onClick={handleExportZip}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
              title="Download Complete Source Code ZIP as requested in Deliverables"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isExporting ? 'Zipping...' : 'Download ZIP'}</span>
            </button>

            {/* Role / User Switcher */}
            <div className="relative pl-1 border-l border-slate-800">
              <select
                id="select-active-user-role"
                value={currentUser.id}
                onChange={(e) => {
                  const targetUser = users.find(u => u.id === e.target.value);
                  if (targetUser) onUserChange(targetUser);
                }}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 pr-6 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
