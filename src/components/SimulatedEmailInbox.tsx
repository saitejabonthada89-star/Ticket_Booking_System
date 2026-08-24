import React, { useState } from 'react';
import { 
  Mail, 
  X, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Ticket, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { EmailNotification, User } from '../types';
import { AppStorage } from '../services/storage';

interface SimulatedEmailInboxProps {
  onClose: () => void;
  currentUser: User;
  onClaimWaitlistFromEmail: (metadata: any) => void;
}

export const SimulatedEmailInbox: React.FC<SimulatedEmailInboxProps> = ({
  onClose,
  currentUser,
  onClaimWaitlistFromEmail,
}) => {
  const [emails, setEmails] = useState<EmailNotification[]>(AppStorage.getEmails());
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(
    emails.length > 0 ? emails[0] : null
  );

  const handleSelectEmail = (email: EmailNotification) => {
    setSelectedEmail(email);
    if (!email.read) {
      email.read = true;
      AppStorage.saveEmails(emails);
      setEmails([...emails]);
    }
  };

  const handleClearInbox = () => {
    AppStorage.saveEmails([]);
    setEmails([]);
    setSelectedEmail(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">Simulated Email Client & Ticket Dispatcher</h3>
              <p className="text-[11px] text-slate-400">Real-time confirmation passes, QR deliveries, and waitlist allocations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {emails.length > 0 && (
              <button
                onClick={handleClearInbox}
                className="px-2.5 py-1 text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Split View */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          
          {/* Email List Sidebar */}
          <div className="border-r border-slate-800 overflow-y-auto bg-slate-950/50 p-2 space-y-1">
            {emails.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                No emails received yet. Complete a booking or trigger a waitlist offer to see emails appear here!
              </div>
            ) : (
              emails.map(email => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-900/80 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className={isSelected ? 'text-indigo-200' : 'text-slate-400'}>
                        To: {email.toEmail}
                      </span>
                      <span className={isSelected ? 'text-indigo-200' : 'text-slate-500'}>
                        {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-semibold text-xs truncate">{email.subject}</p>
                    <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {email.previewText}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Email Message Content Area */}
          <div className="md:col-span-2 overflow-y-auto bg-slate-900 p-6 flex flex-col justify-between">
            {selectedEmail ? (
              <div className="space-y-6">
                {/* Email Meta Header */}
                <div className="pb-4 border-b border-slate-800 space-y-2">
                  <h4 className="font-display font-bold text-lg text-white">
                    {selectedEmail.subject}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>From: <strong>OmniTicket Dispatch Engine &lt;no-reply@omniticket.io&gt;</strong></span>
                    <span>{new Date(selectedEmail.sentAt).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <span>To: <strong>{selectedEmail.toName} &lt;{selectedEmail.toEmail}&gt;</strong></span>
                  </div>
                </div>

                {/* HTML Rendered Content */}
                <div
                  className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-slate-200 text-xs leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.contentHtml }}
                />

                {/* Direct Action for Waitlist Claim */}
                {selectedEmail.type === 'waitlist_offer' && selectedEmail.metadata && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        onClaimWaitlistFromEmail(selectedEmail.metadata);
                        onClose();
                      }}
                      className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>One-Click Claim & Proceed to Checkout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Select an email from the left to view contents and QR code pass.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
