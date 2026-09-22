import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import QRCode from 'qrcode';
import { 
  Copy, 
  Check, 
  ArrowDownLeft, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Wallet
} from 'lucide-react';

export default function Deposit({ onNavigate }) {
  const [depositAddress, setDepositAddress] = useState('0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [deposits, setDeposits] = useState([]);
  const [copied, setCopied] = useState(false);
  
  const [depositAmount, setDepositAmount] = useState('100');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDepositData();
  }, []);

  const loadDepositData = async () => {
    try {
      const [addrData, depData] = await Promise.all([
        api.getDepositAddress(),
        api.getDeposits()
      ]);

      const addr = addrData?.depositAddress || '0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461';
      setDepositAddress(addr);

      const url = await QRCode.toDataURL(addr, {
        width: 220,
        margin: 2,
        color: { dark: '#06B6D4', light: '#0B0F19' }
      });
      setQrDataUrl(url);

      if (depData?.deposits) {
        setDeposits(depData.deposits);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < 20) {
      setError('Minimum deposit is $20.00 USDT.');
      return;
    }
    if (!txHash.trim() || txHash.trim().length < 10) {
      setError('Please provide a valid BEP-20 Transaction Hash (TxID).');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.submitDeposit({
        amount: amt,
        txHash: txHash.trim()
      });

      if (res?.deposit || res?.success) {
        setSuccess('Deposit submitted successfully! Your balance will update automatically upon verification.');
        setTxHash('');
        await loadDepositData();
      } else {
        setError(res?.message || 'Submission failed. Please check the transaction hash.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred submitting deposit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Deposit USDT
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Transfer USDT on the BNB Smart Chain (BEP-20) network to fund your account.
        </p>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: QR & Address (5 Cols) */}
        <div className="lg:col-span-5 clean-card p-6 bg-[#111726] flex flex-col items-center text-center">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold mb-4 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Network: BNB Smart Chain (BEP-20)
          </div>

          {/* QR Code Container */}
          <div className="p-3 rounded-2xl bg-[#0B0F19] border border-white/[0.08] shadow-inner mb-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Deposit QR Code" className="w-44 h-44 rounded-xl object-contain" />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-500">Loading QR...</div>
            )}
          </div>

          <div className="w-full text-left space-y-1 mb-2">
            <span className="text-[11px] font-semibold text-slate-400">Deposit Wallet Address</span>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <input
                type="text"
                readOnly
                value={depositAddress}
                className="bg-transparent text-xs text-slate-300 w-full outline-none font-mono truncate"
              />
              <button
                type="button"
                onClick={copyAddress}
                className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors shrink-0"
                title="Copy Address"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left text-[11px] text-amber-300/90 space-y-1 mt-3">
            <p className="font-semibold text-amber-300">Important Reminders:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-300">
              <li>Send only <b>USDT (BEP-20)</b> to this address.</li>
              <li>Minimum deposit amount is <b>$20.00 USDT</b>.</li>
              <li>Deposits are verified and credited within 5-15 minutes.</li>
            </ul>
          </div>
        </div>

        {/* Right: Submit Form (7 Cols) */}
        <div className="lg:col-span-7 clean-card p-6 sm:p-7 bg-[#111726] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Confirm Your Deposit</h2>
            <p className="text-xs text-slate-400 mb-6">
              After sending USDT from your wallet or exchange, enter the details below to complete the verification.
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Amount Transferred (USDT)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">$</span>
                  <input
                    type="number"
                    step="any"
                    min="20"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="20.00"
                    className="w-full pl-7 pr-16 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm outline-none focus:border-cyan-500"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">USDT</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Transaction Hash (TxID)
                </label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste 64-character hash (e.g. 0x8a1b...)"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-xs outline-none focus:border-cyan-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  You can find the TxID in your Binance, TrustWallet, or MetaMask withdrawal history.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-xs font-semibold rounded-xl mt-2"
              >
                {loading ? 'Verifying Deposit...' : 'Submit Deposit'}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Automated smart verification
            </span>
            <span>Support: 24/7 Live</span>
          </div>
        </div>

      </div>

      {/* Deposit History */}
      <div className="clean-card p-5 sm:p-6 bg-[#111726]">
        <h2 className="text-base font-bold text-white mb-4">Your Recent Deposits</h2>
        {deposits.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No deposits found. Submit your first deposit above.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05] overflow-x-auto">
            {deposits.map((dep) => (
              <div key={dep.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white font-mono">
                      +${dep.amount?.toFixed(2)} USDT
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Tx: {dep.txHash ? `${dep.txHash.slice(0, 10)}...${dep.txHash.slice(-8)}` : 'Internal'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                    dep.status === 'approved' || dep.status === 'completed' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : dep.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {dep.status || 'pending'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(dep.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
