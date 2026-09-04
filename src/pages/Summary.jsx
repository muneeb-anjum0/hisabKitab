import { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { money } from '../lib/currency';
import { monthKey } from '../lib/dates';

const previousMonth = (month) => { const [year, number] = month.split('-').map(Number); const date = new Date(year, number - 2, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };

export default function Summary() {
  const data = useData(); const [month, setMonth] = useState(monthKey());
  const summary = useMemo(() => {
    const transactions = data.transactions.filter((item) => monthKey(item.date) === month && item.type === 'expense');
    const priorSpent = data.transactions.filter((item) => monthKey(item.date) === previousMonth(month) && item.type === 'expense').reduce((total, item) => total + Number(item.amount), 0);
    const received = data.remittances.filter((item) => monthKey(item.receivedAt) === month).reduce((total, item) => total + Number(item.totalAmount), 0);
    const spent = transactions.reduce((total, item) => total + Number(item.amount), 0);
    const byFund = data.funds.map((fund) => ({ name: fund.name, value: transactions.filter((item) => item.fundId === fund.id).reduce((total, item) => total + Number(item.amount), 0), accent: fund.accent })).filter((item) => item.value).sort((a, b) => b.value - a.value);
    const byCategory = data.categories.map((category) => ({ name: category.name, value: transactions.filter((item) => item.categoryId === category.id).reduce((total, item) => total + Number(item.amount), 0) })).filter((item) => item.value).sort((a, b) => b.value - a.value);
    return { received, spent, remaining: received - spent, byFund, byCategory, priorSpent, difference: priorSpent ? (spent - priorSpent) / priorSpent * 100 : null };
  }, [data, month]);
  const max = Math.max(...summary.byFund.map((item) => item.value), 1);
  return <><div className="page-title summary-title"><div><span className="kicker">THE MONTH IN INK</span><h1>THE RECAP</h1></div><input aria-label="Summary month" type="month" value={month} onChange={(event) => setMonth(event.target.value)}/></div><section className="summary-banner"><div><span>IN</span><b>{money(summary.received)}</b></div><i>VS.</i><div><span>OUT</span><b>{money(summary.spent)}</b></div><strong>{money(summary.remaining)}<small>NET THIS MONTH</small></strong></section><div className="summary-insights"><span>LARGEST FUND SPEND <b>{summary.byFund[0]?.name || '—'} · {money(summary.byFund[0]?.value || 0)}</b></span><span>TOP CATEGORY <b>{summary.byCategory[0]?.name || '—'} · {money(summary.byCategory[0]?.value || 0)}</b></span><span>VS LAST MONTH <b>{summary.difference === null ? 'NO PRIOR DATA' : `${summary.difference > 0 ? '+' : ''}${Math.round(summary.difference)}% SPENT`}</b></span></div><section className="summary-columns"><div className="panel bars"><h2>SPENDING BY FUND</h2>{summary.byFund.length ? summary.byFund.map((item) => <div className="bar" key={item.name}><span>{item.name}</span><i><b className={item.accent} style={{ width: `${item.value / max * 100}%` }}/></i><strong>{money(item.value)}</strong></div>) : <p>No expenses this month.</p>}</div><div className="panel category-rank"><h2>TOP CATEGORIES</h2>{summary.byCategory.slice(0, 6).map((item, index) => <div key={item.name}><b>#{index + 1}</b><span>{item.name}</span><strong>{money(item.value)}</strong></div>)}</div></section></>;
}
