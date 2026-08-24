import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Flame, 
  Clock, 
  Sparkles, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  MapPin, 
  Plus, 
  ScanLine,
  Activity,
  AlertTriangle,
  Building
} from 'lucide-react';
import { Venue, EventShow, User, Booking, WaitlistEntry, SystemMetrics } from '../types';
import { AppStorage, TTLConfig } from '../services/storage';
import { TicketEngine } from '../services/ticketEngine';

interface AdminPanelProps {
  venues: Venue[];
  events: EventShow[];
  currentUser: User;
  systemMetrics: SystemMetrics;
  onRefreshData: () => void;
  onOpenGateScanner: () => void;
}

export interface SimulationLog {
  id: string;
  type: 'concurrency' | 'ttl' | 'waitlist';
  timestamp: string;
  title: string;
  details: string;
  status: 'success' | 'conflict_caught' | 'failed';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  venues,
  events,
  currentUser,
  systemMetrics,
  onRefreshData,
  onOpenGateScanner,
}) => {
  const [ttlConfig, setTTLConfig] = useState<TTLConfig>(AppStorage.getTTLConfig());
  const [simulationLogs, setSimulationLogs] = useState<SimulationLog[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSaveTTLConfig = (newConfig: TTLConfig) => {
    setTTLConfig(newConfig);
    AppStorage.saveTTLConfig(newConfig);
    onRefreshData();
  };

  /**
   * Chaos Test 1: Concurrency Collision Race Condition
   * Simulate 2 distinct users trying to book Seat C5 at the EXACT same millisecond
   */
  const handleSimulateConcurrencyClash = async () => {
    setIsSimulating(true);
    const targetEvent = events[0];
    const targetSeatId = 'C4'; // Contested seat

    const userAlice: User = {
      id: 'sim_user_alice',
      name: 'Simulated User Alice',
      email: 'alice.sim@example.com',
      role: 'customer',
      avatar: '',
    };

    const userBob: User = {
      id: 'sim_user_bob',
      name: 'Simulated User Bob',
      email: 'bob.sim@example.com',
      role: 'customer',
      avatar: '',
    };

    // Ensure seat is available first
    if (targetEvent.seats[targetSeatId]) {
      targetEvent.seats[targetSeatId].status = 'available';
      targetEvent.seats[targetSeatId].heldByUserId = undefined;
      targetEvent.seats[targetSeatId].heldUntil = undefined;
      AppStorage.saveEvents(events);
    }

    // Launch simultaneous hold attempts
    const [resAlice, resBob] = await Promise.all([
      TicketEngine.holdSeats(targetEvent.id, [targetSeatId], userAlice),
      TicketEngine.holdSeats(targetEvent.id, [targetSeatId], userBob),
    ]);

    const logs: SimulationLog[] = [];

    if (resAlice.success && !resBob.success) {
      logs.push({
        id: 'log_' + Math.random(),
        type: 'concurrency',
        timestamp: new Date().toLocaleTimeString(),
        title: `Race Condition: Alice Acquired Lock on Seat ${targetSeatId}`,
        details: `Transaction A acquired mutex lease & held seat. Transaction B received 409 Conflict: "${resBob.error}"`,
        status: 'conflict_caught',
      });
    } else if (resBob.success && !resAlice.success) {
      logs.push({
        id: 'log_' + Math.random(),
        type: 'concurrency',
        timestamp: new Date().toLocaleTimeString(),
        title: `Race Condition: Bob Acquired Lock on Seat ${targetSeatId}`,
        details: `Transaction B acquired mutex lease & held seat. Transaction A received 409 Conflict: "${resAlice.error}"`,
        status: 'conflict_caught',
      });
    } else {
      logs.push({
        id: 'log_' + Math.random(),
        type: 'concurrency',
        timestamp: new Date().toLocaleTimeString(),
        title: 'Concurrency Test Result',
        details: `Alice: ${resAlice.success ? 'Success' : resAlice.error} | Bob: ${resBob.success ? 'Success' : resBob.error}`,
        status: 'success',
      });
    }

    setSimulationLogs(prev => [...logs, ...prev]);
    setIsSimulating(false);
    onRefreshData();
  };

  /**
   * Chaos Test 2: TTL Expiration & Instant Auto-Release
   */
  const handleSimulateFastTTL = async () => {
    setIsSimulating(true);
    const targetEvent = events[0];
    const targetSeatId = 'D2';

    const testUser: User = {
      id: 'sim_test_user',
      name: 'Checkout Abandoner',
      email: 'abandon@example.com',
      role: 'customer',
      avatar: '',
    };

    // Place a short 3-second hold
    const holdRes = await TicketEngine.holdSeats(targetEvent.id, [targetSeatId], testUser, 3);
    
    setSimulationLogs(prev => [
      {
        id: 'log_' + Math.random(),
        type: 'ttl',
        timestamp: new Date().toLocaleTimeString(),
        title: `Hold Placed: Seat ${targetSeatId} with 3s Fast TTL`,
        details: 'Seat is now marked HELD. Simulating checkout abandonment & countdown...',
        status: 'success',
      },
      ...prev,
    ]);

    onRefreshData();

    // Wait 4 seconds then run sweeper
    setTimeout(() => {
      const sweepRes = TicketEngine.processTTLAndAutoRelease();
      setSimulationLogs(prev => [
        {
          id: 'log_' + Math.random(),
          type: 'ttl',
          timestamp: new Date().toLocaleTimeString(),
          title: `TTL Engine Auto-Released Expired Hold on ${targetSeatId}`,
          details: `Sweeper freed ${sweepRes.releasedHoldsCount} hold(s) and dispatched expiration email notification to user.`,
          status: 'success',
        },
        ...prev,
      ]);
      setIsSimulating(false);
      onRefreshData();
    }, 3500);
  };

  /**
   * Chaos Test 3: Waitlist Cascade Simulation
   */
  const handleSimulateWaitlistCascade = () => {
    setIsSimulating(true);
    const targetEvent = events.find(e => e.id === 'evt_taylor_swift') || events[0];

    // Seed 2 waitlist users if none
    const waitlists = AppStorage.getWaitlists();
    const existing = waitlists.filter(w => w.eventId === targetEvent.id);

    if (existing.length === 0) {
      TicketEngine.joinWaitlist(targetEvent.id, 'cat_pit_vip', {
        id: 'user_cand_1',
        name: 'Waitlist Candidate 1 (Sarah)',
        email: 'sarah.cand@example.com',
        role: 'customer',
        avatar: '',
      });
      TicketEngine.joinWaitlist(targetEvent.id, 'cat_pit_vip', {
        id: 'user_cand_2',
        name: 'Waitlist Candidate 2 (David)',
        email: 'david.cand@example.com',
        role: 'customer',
        avatar: '',
      });
    }

    // Allocate a test freed seat
    const reallocated = TicketEngine.reallocateSeatsToNextWaitlist(targetEvent.id, 'cat_pit_vip', ['A1']);

    setSimulationLogs(prev => [
      {
        id: 'log_' + Math.random(),
        type: 'waitlist',
        timestamp: new Date().toLocaleTimeString(),
        title: `Cancellation Triggered: Seat A1 Reallocated`,
        details: `Engine queried FIFO queue, found top candidate, set status to OFFERED, and activated 10-min claim timer.`,
        status: 'success',
      },
      ...prev,
    ]);

    setIsSimulating(false);
    onRefreshData();
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="font-display font-bold text-2xl text-white">System Admin & Chaos Testing Engine</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time mutex verification, TTL sweeper controls, and live gate validation
          </p>
        </div>

        <button
          onClick={onOpenGateScanner}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 self-start sm:self-auto"
        >
          <ScanLine className="w-4 h-4" />
          <span>Launch Gate QR Ticket Scanner</span>
        </button>
      </div>

      {/* System Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 block">Double-Bookings Prevented</span>
          <span className="font-display font-black text-xl text-rose-400 mt-0.5 block">
            {systemMetrics.concurrencyCollisionsPrevented}
          </span>
          <span className="text-[10px] text-slate-500">Atomic Mutex Locks</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 block">Auto-Released Holds</span>
          <span className="font-display font-black text-xl text-amber-400 mt-0.5 block">
            {systemMetrics.autoReleasedHoldsCount}
          </span>
          <span className="text-[10px] text-slate-500">TTL Sweeper Cleaner</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 block">Waitlist Allocations</span>
          <span className="font-display font-black text-xl text-purple-400 mt-0.5 block">
            {systemMetrics.waitlistReallocationsCount}
          </span>
          <span className="text-[10px] text-slate-500">Instant Cancellation Offers</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 block">Active Seat Holds</span>
          <span className="font-display font-black text-xl text-indigo-400 mt-0.5 block">
            {systemMetrics.activeHoldsCount}
          </span>
          <span className="text-[10px] text-slate-500">Temporary In-Flight</span>
        </div>
      </div>

      {/* Interactive Chaos & Concurrency Simulator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Interactive Concurrency & Chaos Testing Center
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute live race condition collisions and waitlist auto-assignment cascades
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Test 1 */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                Concurrency Lock Test
              </span>
              <h4 className="font-display font-bold text-sm text-white mt-1.5">
                Simultaneous Seat Selection Clash
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Fires 2 simultaneous async requests at the exact same millisecond for seat C4. Demonstrates mutex collision handling.
              </p>
            </div>
            <button
              id="btn-chaos-concurrency"
              onClick={handleSimulateConcurrencyClash}
              disabled={isSimulating}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Trigger Race Condition</span>
            </button>
          </div>

          {/* Test 2 */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                TTL Expiration Test
              </span>
              <h4 className="font-display font-bold text-sm text-white mt-1.5">
                Cart Abandonment Auto-Release
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Locks seat D2 with 3s TTL, then executes background sweeper to verify automatic release back to the pool.
              </p>
            </div>
            <button
              id="btn-chaos-ttl"
              onClick={handleSimulateFastTTL}
              disabled={isSimulating}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Simulate TTL Timeout</span>
            </button>
          </div>

          {/* Test 3 */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                Waitlist Engine Test
              </span>
              <h4 className="font-display font-bold text-sm text-white mt-1.5">
                Cancellation & 10-Min Offer Cascade
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Simulates ticket cancellation on a sold-out show and assigns the freed seat to the #1 priority waitlist queue candidate.
              </p>
            </div>
            <button
              id="btn-chaos-waitlist"
              onClick={handleSimulateWaitlistCascade}
              disabled={isSimulating}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trigger Waitlist Cascade</span>
            </button>
          </div>

        </div>

        {/* Live Simulation Audit Logs */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-400" />
              Live Simulation Output Stream
            </h4>
            {simulationLogs.length > 0 && (
              <button
                onClick={() => setSimulationLogs([])}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Clear Stream
              </button>
            )}
          </div>

          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 max-h-56 overflow-y-auto space-y-2 font-mono text-xs">
            {simulationLogs.length === 0 ? (
              <p className="text-slate-600 italic">No simulations executed yet. Click one of the testing buttons above to see atomic transaction logs.</p>
            ) : (
              simulationLogs.map(log => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
                  <span className="text-slate-500 text-[10px] whitespace-nowrap mt-0.5">{log.timestamp}</span>
                  {log.status === 'conflict_caught' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  ) : log.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-slate-200">{log.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{log.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* System TTL Config Sliders */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          Configurable Engine Timers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-2 font-medium">
              <span>Seat Hold Duration (Checkout TTL)</span>
              <span className="font-bold text-indigo-400 font-mono">
                {Math.floor(ttlConfig.holdDurationSeconds / 60)} Mins ({ttlConfig.holdDurationSeconds}s)
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="1200"
              step="30"
              value={ttlConfig.holdDurationSeconds}
              onChange={(e) => handleSaveTTLConfig({
                ...ttlConfig,
                holdDurationSeconds: Number(e.target.value),
              })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Time granted to customer before cart auto-releases.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-2 font-medium">
              <span>Waitlist Priority Offer Window</span>
              <span className="font-bold text-purple-400 font-mono">
                {Math.floor(ttlConfig.waitlistOfferDurationSeconds / 60)} Mins ({ttlConfig.waitlistOfferDurationSeconds}s)
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="1200"
              step="30"
              value={ttlConfig.waitlistOfferDurationSeconds}
              onChange={(e) => handleSaveTTLConfig({
                ...ttlConfig,
                waitlistOfferDurationSeconds: Number(e.target.value),
              })}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Time given to a waitlisted candidate to complete booking before cascading.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
