'use client';

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FinanceOverviewProps {
  summary: {
    totalRevenue: number;
    totalPayments: number;
    pendingPayments: number;
    totalTransactions: number;
    totalWalletBalance: number;
    platformFee: number;
    recentTransactions: Array<{
      amount: number;
      type: string;
      createdAt: Date;
    }>;
  };
}

export default function FinanceOverview({ summary }: FinanceOverviewProps) {
  // Process transaction data for chart
  const chartData = summary.recentTransactions
    .reduce((acc: any[], transaction) => {
      const date = new Date(transaction.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = acc.find(item => item.date === date);
      
      if (existing) {
        if (transaction.type === 'DEPOSIT' || transaction.type === 'EARNING') {
          existing.income += transaction.amount;
        } else {
          existing.expenses += transaction.amount;
        }
      } else {
        acc.push({
          date,
          income: (transaction.type === 'DEPOSIT' || transaction.type === 'EARNING') ? transaction.amount : 0,
          expenses: (transaction.type === 'WITHDRAWAL' || transaction.type === 'PAYMENT') ? transaction.amount : 0,
        });
      }
      return acc;
    }, [])
    .slice(-14); // Last 14 days

  const stats = [
    {
      label: 'Total Revenue',
      value: `KES ${summary.totalRevenue.toLocaleString()}`,
      change: '+12.5%',
      positive: true,
      icon: '💰'
    },
    {
      label: 'Platform Fees',
      value: `KES ${summary.platformFee.toLocaleString()}`,
      change: '+8.2%',
      positive: true,
      icon: '📊'
    },
    {
      label: 'Total Payments',
      value: `KES ${summary.totalPayments.toLocaleString()}`,
      change: '+15.3%',
      positive: true,
      icon: '💳'
    },
    {
      label: 'Wallet Balance',
      value: `KES ${summary.totalWalletBalance.toLocaleString()}`,
      change: '-3.1%',
      positive: false,
      icon: '👛'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                stat.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-slate-600 text-sm font-medium">{stat.label}</h3>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Transaction Trend (Last 14 Days)</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value: number) => `KES ${value.toLocaleString()}`}
                />
                <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Statistics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-slate-600 text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-slate-900">{summary.totalTransactions}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-indigo-500">receipt_long</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div>
                <p className="text-amber-700 text-sm">Pending Payments</p>
                <p className="text-2xl font-bold text-amber-900">{summary.pendingPayments}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-amber-500">schedule</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
              <div>
                <p className="text-emerald-700 text-sm">Avg Transaction</p>
                <p className="text-2xl font-bold text-emerald-900">
                  KES {summary.totalTransactions > 0 
                    ? (summary.totalRevenue / summary.totalTransactions).toLocaleString(undefined, {maximumFractionDigits: 0})
                    : 0
                  }
                </p>
              </div>
              <span className="material-symbols-outlined text-4xl text-emerald-500">trending_up</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
