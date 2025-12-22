"use client";
import React from 'react';

export type TransactionStatus = 'preparing' | 'signing' | 'submitting' | 'confirmed' | 'failed';

interface TransactionStatusModalProps {
    isOpen: boolean;
    status: TransactionStatus;
    transactionId?: string;
    error?: string;
    network?: string;
    onClose: () => void;
}

export const TransactionStatusModal: React.FC<TransactionStatusModalProps> = ({
    isOpen,
    status,
    transactionId,
    error,
    network = 'testnet',
    onClose,
}) => {
    if (!isOpen) return null;

    const getStatusIcon = () => {
        switch (status) {
            case 'preparing':
                return (
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                        <span className="iconify text-blue-500 animate-pulse" data-icon="lucide:loader-2" data-width="32"></span>
                    </div>
                );
            case 'signing':
                return (
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-6">
                        <span className="iconify text-purple-500 animate-pulse" data-icon="lucide:pen-tool" data-width="32"></span>
                    </div>
                );
            case 'submitting':
                return (
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                        <span className="iconify text-emerald-500 animate-spin" data-icon="lucide:loader-2" data-width="32"></span>
                    </div>
                );
            case 'confirmed':
                return (
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                        <span className="iconify text-emerald-500" data-icon="lucide:check-circle" data-width="32"></span>
                    </div>
                );
            case 'failed':
                return (
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                        <span className="iconify text-red-500" data-icon="lucide:x-circle" data-width="32"></span>
                    </div>
                );
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'preparing':
                return {
                    title: 'Preparing Transaction',
                    description: 'Building your transaction...',
                };
            case 'signing':
                return {
                    title: 'Awaiting Signature',
                    description: 'Please approve the transaction in your wallet',
                };
            case 'submitting':
                return {
                    title: 'Submitting',
                    description: 'Transaction is being submitted to the network...',
                };
            case 'confirmed':
                return {
                    title: 'Transaction Confirmed',
                    description: 'Your transaction has been successfully processed!',
                };
            case 'failed':
                return {
                    title: 'Transaction Failed',
                    description: error || 'An error occurred while processing your transaction',
                };
        }
    };

    const statusInfo = getStatusText();
    const explorerUrl = transactionId ? `https://hashscan.io/${network}/transaction/${transactionId}` : null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#020403]/90 backdrop-blur-sm" onClick={status === 'confirmed' || status === 'failed' ? onClose : undefined}></div>

            <div className="glass-panel w-full max-w-md rounded-2xl relative z-10 p-8 border-white/5">
                {getStatusIcon()}

                <h3 className="text-xl font-bold text-white mb-2 text-center uppercase tracking-widest">
                    {statusInfo.title}
                </h3>
                <p className="text-xs text-slate-400 text-center mb-6 uppercase tracking-widest">
                    {statusInfo.description}
                </p>

                {status === 'signing' && (
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 mb-6">
                        <div className="flex items-start gap-3">
                            <span className="iconify text-purple-500 mt-0.5" data-icon="lucide:info" data-width="16"></span>
                            <p className="text-[10px] text-slate-300 uppercase tracking-widest">
                                Check your wallet extension to approve this transaction
                            </p>
                        </div>
                    </div>
                )}

                {status === 'confirmed' && transactionId && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Transaction ID</p>
                            <p className="text-[10px] text-white font-mono break-all">{transactionId}</p>
                        </div>

                        {explorerUrl && (
                            <a
                                href={explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="iconify" data-icon="lucide:external-link" data-width="14"></span>
                                View on Hashscan
                            </a>
                        )}
                    </div>
                )}

                {status === 'failed' && (
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 mb-6">
                        <div className="flex items-start gap-3">
                            <span className="iconify text-red-500 mt-0.5" data-icon="lucide:alert-triangle" data-width="16"></span>
                            <p className="text-[10px] text-slate-300 leading-relaxed">
                                {error || 'Please try again or contact support if the issue persists.'}
                            </p>
                        </div>
                    </div>
                )}

                {(status === 'confirmed' || status === 'failed') && (
                    <button
                        onClick={onClose}
                        className="w-full py-3 mt-4 rounded-xl bg-emerald-500 text-[#020403] text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all"
                    >
                        Close
                    </button>
                )}

                {status === 'preparing' || status === 'signing' || status === 'submitting' ? (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-emerald-500/30 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
