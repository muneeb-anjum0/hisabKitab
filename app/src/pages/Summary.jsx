import { useMemo, useState } from 'react';
import { useData } from '../contexts/data';
import { money } from '../lib/currency';
import { monthKey } from '../lib/dates';
import { ComicDatePicker } from '../components/comic/Comic';

const previousMonth = (month) => {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(year, number - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export default function Summary() {
  const data = useData();
  const [month, setMonth] = useState(monthKey());
  const summary = useMemo(() => {
    const transactions = data.transactions.filter(
      (item) => monthKey(item.date) === month && item.type === 'expense',
    );
    const priorSpent = data.transactions
      .filter((item) => monthKey(item.date) === previousMonth(month) && item.type === 'expense')
      .reduce((total, item) => total + Number(item.amount), 0);
    const received = data.remittances
      .filter((item) => monthKey(item.receivedAt) === month)
      .reduce((total, item) => total + Number(item.totalAmount), 0);
    const spent = transactions.reduce((total, item) => total + Number(item.amount), 0);
    const byFund = data.funds
      .map((fund) => ({
        id: fund.id,
        name: fund.name,
        value: transactions
          .filter((item) => item.fundId === fund.id)
          .reduce((total, item) => total + Number(item.amount), 0),
        accent: fund.accent,
      }))
      .filter((item) => item.value)
      .sort((a, b) => b.value - a.value);
    const priorTransactions = data.transactions.filter(
      (item) => monthKey(item.date) === previousMonth(month) && item.type === 'expense',
    );
    const categoryIds = new Set(data.categories.map((category) => category.id));
    const byCategory = [
      ...data.categories.map((category) => {
        const value = transactions
          .filter((item) => item.categoryId === category.id)
          .reduce((total, item) => total + Number(item.amount), 0);
        const previous = priorTransactions
          .filter((item) => item.categoryId === category.id)
          .reduce((total, item) => total + Number(item.amount), 0);
        return { id: category.id, name: category.name, value, previous };
      }),
      {
        id: 'uncategorized',
        name: 'Deleted categories',
        value: transactions
          .filter((item) => !categoryIds.has(item.categoryId))
          .reduce((total, item) => total + Number(item.amount), 0),
        previous: priorTransactions
          .filter((item) => !categoryIds.has(item.categoryId))
          .reduce((total, item) => total + Number(item.amount), 0),
      },
    ]
      .filter((item) => item.value || item.previous)
      .sort((a, b) => b.value - a.value);
    const budgets = data.funds
      .filter((fund) => Number(fund.monthlyBudget) > 0)
      .map((fund) => {
        const used = byFund.find((item) => item.id === fund.id)?.value || 0;
        return { id: fund.id, name: fund.name, limit: Number(fund.monthlyBudget), used };
      });
    return {
      received,
      spent,
      remaining: received - spent,
      byFund,
      byCategory,
      budgets,
      priorSpent,
      difference: priorSpent ? ((spent - priorSpent) / priorSpent) * 100 : null,
    };
  }, [data, month]);
  const max = Math.max(...summary.byFund.map((item) => item.value), 1);
  return (
    <>
      <div className="page-title summary-title">
        <div>
          <span className="kicker">THE MONTH IN INK</span>
          <h1>THE RECAP</h1>
        </div>
        <ComicDatePicker label="SUMMARY MONTH" mode="month" value={month} onChange={setMonth} />
      </div>
      <section className="summary-banner">
        <div>
          <span>IN</span>
          <b>{money(summary.received)}</b>
        </div>
        <i>VS.</i>
        <div>
          <span>OUT</span>
          <b>{money(summary.spent)}</b>
        </div>
        <strong>
          {money(summary.remaining)}
          <small>NET THIS MONTH</small>
        </strong>
      </section>
      <div className="summary-insights">
        <span>
          LARGEST FUND SPEND{' '}
          <b>
            {summary.byFund[0]?.name || '—'} · {money(summary.byFund[0]?.value || 0)}
          </b>
        </span>
        <span>
          VS LAST MONTH{' '}
          <b>
            {summary.difference === null
              ? 'NO PRIOR DATA'
              : `${summary.difference > 0 ? '+' : ''}${Math.round(summary.difference)}% SPENT`}
          </b>
        </span>
      </div>
      <section className="summary-columns summary-funds-only">
        <div className="panel bars">
          <h2>SPENDING BY FUND</h2>
          <p className="chart-explainer">
            How much each Fund spent this month. The fullest bar is the highest-spending Fund.
          </p>
          {summary.byFund.length ? (
            summary.byFund.map((item) => (
              <div className="bar" key={item.id}>
                <span>{item.name}</span>
                <i>
                  <b className={item.accent} style={{ width: `${(item.value / max) * 100}%` }} />
                </i>
                <strong>{money(item.value)}</strong>
              </div>
            ))
          ) : (
            <p>No expenses this month.</p>
          )}
        </div>
        <div className="panel bars">
          <h2>SPENDING BY CATEGORY</h2>
          <p className="chart-explainer">This month compared with the month before.</p>
          {summary.byCategory.length ? (
            summary.byCategory.map((item) => (
              <div className="bar" key={item.id}>
                <span>{item.name}</span>
                <i>
                  <b
                    className="yellow"
                    style={{ width: `${(item.value / Math.max(summary.spent, 1)) * 100}%` }}
                  />
                </i>
                <strong>
                  {money(item.value)} <small>prev. {money(item.previous)}</small>
                </strong>
              </div>
            ))
          ) : (
            <p>No category spending yet.</p>
          )}
        </div>
        {summary.budgets.length > 0 && (
          <div className="panel bars">
            <h2>FUND SPENDING LIMITS</h2>
            {summary.budgets.map((item) => {
              const ratio = item.used / item.limit;
              return (
                <div className="bar" key={item.id}>
                  <span>{item.name}</span>
                  <i>
                    <b
                      className={ratio >= 1 ? 'red' : ratio >= 0.8 ? 'yellow' : 'green'}
                      style={{ width: `${Math.min(100, ratio * 100)}%` }}
                    />
                  </i>
                  <strong>
                    {money(item.used)} / {money(item.limit)}
                    {ratio >= 1 ? ' · LIMIT REACHED' : ratio >= 0.8 ? ' · NEAR LIMIT' : ''}
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
