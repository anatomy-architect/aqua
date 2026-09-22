import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  Wallet, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Clock, 
  Lock, 
  ArrowRight,
  RefreshCw,
  QrCode
} from 'lucide-react';
import QRCode from 'qrcode';
import Modal from '../../components/Modal';

export default function AdminWalletConfig() {
  const [currentAddress, setCurrentAddress] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [newAddress, setNewAddress] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    loadWalletConfig();
    loadAuditLogs();
  }, []);

  const loadWalletConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminWallet();
      if (data?.depositAddress) {
        setCurrentAddress(data.depositAddress);
        setUpdatedAt(data.updatedAt);
        // Generate QR
        const qr = await QRCode.toDataURL(data.depositAddress, {
          margin: 2,
          width: 200,
          color: { dark: '#0A0F2C', light: '#00E5FF' }
        });
        setQrCodeUrl(qr);
      }
    } catch (err) {
      setError(err.message || 'Failed to load wallet configuration.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const data = await api.getAdminAuditLogs();
      if (data?.logs) {
        // Filter wallet-related logs
        const walletAudits = data.logs.filter(l => 
          l.targetType === 'SETTINGS' && (l.targetId === 'bep20_deposit_address' || l.action === 'WALLET_CONFIG_UPDATE')
        );
        setAuditLogs(walletAudits.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newAddress || !/^0x[a-fA-F0-9]{40}$/.test(newAddress.trim())) {
      setError('Please enter a valid BEP20 wallet address (42 characters starting with 0x).');
      return;
    }

    if (newAddress.trim().toLowerCase() === currentAddress.toLowerCase()) {
      setError('The new address is identical to the current receiving address.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmUpdate = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.updateAdminWallet({
        depositAddress: newAddress.trim(),
        reason: reason.trim() || 'Administrative deposit wallet update'
      });

      setSuccess(res.message || 'BEP20 deposit receiving wallet updated successfully.');
      setCurrentAddress(newAddress.trim());
      setNewAddress('');
      setReason('');
      setShowConfirmModal(false);

      // Re-generate QR
      const qr = await QRCode.toDataURL(newAddress.trim(), {
        margin: 2,
        width: 200,
        color: { dark: '#0A0F2C', light: '#00E5FF' }
      });
      setQrCodeUrl(qr);

      // Reload audits
      loadAuditLogs();
    } catch (err) {
      setError(err.message || 'Failed to update wallet address.');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 text-gold border border-gold/30 text-xs font-mono mb-2">
            <Lock className="w-3.5 h-3.5" /> Treasury Configuration
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-primary">
            WALLET <span className="text-gold">CONFIGURATION</span>
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Manage the platform receiving deposit address for BEP20 USDT investments.
          </p>
        </div>

        <button
          onClick={loadWalletConfig}
          disabled={loading}
          className="btn-ghost text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-950/60 border border-green-500/40 text-green-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Grid: Active Wallet Display & Update Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Active Configuration & Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Receiving Address Card */}
          <div className="glass-card-gold p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-gold uppercase tracking-wider font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gold" /> Active Receiving Wallet
              </span>
              <span className="badge-gold">BEP20 / BSC Only</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs">
              <div className="p-3 rounded-xl bg-navy/80 border border-white/5">
                <span className="text-muted block text-[11px] uppercase font-mono">Accepted Asset</span>
                <span className="font-heading font-bold text-sm text-primary">USDT (Tether USD)</span>
              </div>
              <div className="p-3 rounded-xl bg-navy/80 border border-white/5">
                <span className="text-muted block text-[11px] uppercase font-mono">Settlement Network</span>
                <span className="font-heading font-bold text-sm text-cyan">Binance Smart Chain (BEP20)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted uppercase mb-1.5">
                Public Receiving Address
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentAddress || 'Loading...'}
                  className="input-glass font-mono text-xs text-cyan tracking-wider bg-navy/90 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentAddress)}
                  className="btn-outline-cyan px-4 py-3 shrink-0 text-xs"
                  title="Copy Address"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {updatedAt && (
              <p className="text-[11px] text-muted font-mono mt-3 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted" /> Last updated: {new Date(updatedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Update Wallet Form */}
          <div className="glass-card p-6">
            <h2 className="font-heading text-lg text-primary mb-1">
              UPDATE RECEIVING <span className="text-cyan">DEPOSIT ADDRESS</span>
            </h2>
            <p className="text-xs text-secondary mb-5">
              Changing this address will immediately update the deposit receiving address shown to all investors.
            </p>

            <form onSubmit={handleOpenConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase mb-1.5">
                  New BEP20 Deposit Address *
                </label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-glass font-mono text-xs"
                />
                <span className="text-[11px] text-muted block mt-1">
                  Must be a valid 42-character Binance Smart Chain address starting with 0x.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted uppercase mb-1.5">
                  Reason for Update (Audit Log)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Scheduled cold storage rotation"
                  className="input-glass text-xs"
                />
              </div>

              <button
                type="submit"
                className="btn-cyan py-3 px-6 text-xs font-bold"
              >
                Review & Update Address <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Live QR & Security Rules */}
        <div className="space-y-6">
          
          {/* QR Card */}
          <div className="glass-card p-6 text-center">
            <h3 className="font-heading text-sm font-bold text-primary mb-3 flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4 text-cyan" /> Deposit QR Code
            </h3>

            {qrCodeUrl ? (
              <div className="inline-block p-3 bg-navy rounded-2xl border border-cyan/30 shadow-inner">
                <img src={qrCodeUrl} alt="Deposit QR" className="w-40 h-40 rounded-lg mx-auto" />
              </div>
            ) : (
              <div className="w-40 h-40 bg-navy/60 rounded-2xl border border-white/10 mx-auto flex items-center justify-center text-xs text-muted">
                Generating...
              </div>
            )}

            <p className="text-[11px] text-muted mt-3 font-mono">
              BEP20 USDT Direct Transfer
            </p>
          </div>

          {/* Strict Security Architecture Notice */}
          <div className="p-4 rounded-xl bg-navy/80 border border-cyan/20 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-cyan font-bold font-heading">
              <ShieldCheck className="w-4 h-4 text-cyan" /> Security Policy
            </div>
            <ul className="space-y-1.5 text-[11px] text-secondary leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-cyan font-bold">•</span>
                <span><strong>Public Receiving Only:</strong> This address is only used to receive inbound deposits.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan font-bold">•</span>
                <span><strong>Zero Private Key Storage:</strong> Private keys and seed phrases are never stored or requested.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan font-bold">•</span>
                <span><strong>Strict Audit Logging:</strong> Every modification is permanently recorded with timestamp and admin identifier.</span>
              </li>
            </ul>
          </div>

          {/* Recent Audits */}
          {auditLogs.length > 0 && (
            <div className="glass-card p-4 space-y-2">
              <span className="text-[11px] font-mono text-muted uppercase font-bold block">
                Recent Wallet Audits
              </span>
              <div className="space-y-2 text-xs">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-navy/60 border border-white/5">
                    <p className="text-[11px] text-primary truncate">{log.details}</p>
                    <div className="flex justify-between text-[10px] text-muted mt-1 font-mono">
                      <span>{log.actorEmail}</span>
                      <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => !submitting && setShowConfirmModal(false)}
        title="Confirm Wallet Address Change"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-gold/40 text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <span>
              <strong>Warning:</strong> You are about to change the system-wide BEP20 USDT deposit address. All new deposit requests will immediately direct investors to this new address.
            </span>
          </div>

          <div className="space-y-2 p-3.5 rounded-xl bg-navy/90 border border-white/10 font-mono">
            <div>
              <span className="text-muted text-[10px] block uppercase">Current Address:</span>
              <span className="text-muted text-xs break-all">{currentAddress}</span>
            </div>
            <div className="pt-2 border-t border-white/10">
              <span className="text-cyan text-[10px] block uppercase font-bold">New Address:</span>
              <span className="text-cyan text-xs font-bold break-all">{newAddress}</span>
            </div>
            {reason && (
              <div className="pt-2 border-t border-white/10">
                <span className="text-muted text-[10px] block uppercase">Reason:</span>
                <span className="text-primary text-xs">{reason}</span>
              </div>
            )}
          </div>

          <p className="text-muted text-[11px]">
            Are you sure you want to change the USDT BEP20 deposit wallet?
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              disabled={submitting}
              className="btn-ghost flex-1 py-2.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmUpdate}
              disabled={submitting}
              className="btn-gold flex-1 py-2.5 text-xs font-bold"
            >
              {submitting ? 'Updating...' : 'Yes, Confirm & Update'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
